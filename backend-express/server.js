// server.js
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// ---- Config dinámica de URLs/orígenes
const FRONTEND_URL = (process.env.BASE_FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://localhost:3001,https://qrsplit.vercel.app'
).split(',').map(s => s.trim());

// --- util para parsear assignees que pueden venir como string/JSON
const parseAssignees = (assigneesString) => {
  try {
    if (Array.isArray(assigneesString)) return assigneesString;
    return JSON.parse(assigneesString || '[]');
  } catch {
    return [];
  }
};

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// 🔄 REAL-TIME: Store para sesiones activas y usuarios conectados
const activeSessions = new Map();
const userSessions = new Map();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Función: Sanitización de números
const sanitizeNumber = (value) => {
  if (value === null || value === undefined) return 0;

  let str = String(value).trim();
  console.log(`🔢 [DEBUG] Valor original recibido: "${value}"`);

  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
    console.log(`🔢 [COMA DETECTADA] Convertido a: "${str}"`);
  } else if (str.includes('.')) {
    const lastDotIndex = str.lastIndexOf('.');
    const digitsAfterLastDot = str.length - lastDotIndex - 1;
    if (digitsAfterLastDot === 2) {
      console.log(`🔢 [PUNTO DECIMAL] Mantenido: "${str}"`);
    } else {
      str = str.replace(/\./g, '');
      console.log(`🔢 [PUNTOS DE MILES] Convertido a: "${str}"`);
    }
  }

  const result = parseFloat(str);
  console.log(`🔢 [RESULTADO FINAL] "${value}" → ${result}`);
  return isNaN(result) ? 0 : result;
};

// SPLIT ENGINE - Tipos de división soportados
const SplitMethods = {
  EQUAL: 'equal',
  PROPORTIONAL: 'proportional',
  WEIGHTED: 'weighted',
  CUSTOM: 'custom'
};

// =======================
//   SPLIT ENGINE (FIX)
// =======================
class SplitEngine {
  static calculateEqualSplit(totalAmount, participants) {
    const participantCount = participants.length;
    if (participantCount === 0) return [];

    const amountPerPerson = totalAmount / participantCount;
    return participants.map(participant => ({
      participantId: participant.id,
      userId: participant.userId,
      name: participant.name || `User ${participant.userId}`,
      amount: Number(amountPerPerson.toFixed(2)),
      percentage: Number((100 / participantCount).toFixed(2)),
      items: [],
      method: SplitMethods.EQUAL
    }));
  }

  static calculateProportionalSplit(items, participants) {
    const participantTotals = new Map();
    let grandTotal = 0;

    participants.forEach(p => participantTotals.set(p.id, 0));

    (items || []).forEach(raw => {
      const item = {
        ...raw,
        amount: Number(raw.amount) || 0,
        tax: Number(raw.tax) || 0,
        tip: Number(raw.tip) || 0,
        assignees: Array.isArray(raw.assignees) ? raw.assignees : parseAssignees(raw.assignees)
      };

      const itemTotal = item.amount + item.tax + item.tip;
      grandTotal += itemTotal;

      const assignees = Array.isArray(item.assignees) ? item.assignees : [];
      if (assignees.length === 0) {
        const amountPerPerson = participants.length > 0 ? (itemTotal / participants.length) : 0;
        participants.forEach(p => {
          participantTotals.set(p.id, (participantTotals.get(p.id) || 0) + amountPerPerson);
        });
      } else {
        const amountPerAssignee = itemTotal / assignees.length;
        assignees.forEach(assigneeId => {
          if (participantTotals.has(assigneeId)) {
            participantTotals.set(assigneeId, (participantTotals.get(assigneeId) || 0) + amountPerAssignee);
          }
        });
      }
    });

    return participants.map(participant => {
      const amount = participantTotals.get(participant.id) || 0;
      const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;

      const participantItems = (items || [])
        .map(raw => ({
          ...raw,
          assignees: Array.isArray(raw.assignees) ? raw.assignees : parseAssignees(raw.assignees),
          amount: Number(raw.amount) || 0
        }))
        .filter(item => {
          if (!item.assignees || item.assignees.length === 0) return true;
          return item.assignees.includes(participant.id);
        });

      return {
        participantId: participant.id,
        userId: participant.userId,
        name: participant.name || `User ${participant.userId}`,
        amount: Number(amount.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
        items: participantItems.map(item => {
          const assignees = Array.isArray(item.assignees) ? item.assignees : [];
          const denom = assignees.length > 0 ? assignees.length : (participants.length || 1);
          return {
            id: item.id,
            name: item.name,
            amount: Number(item.amount) || 0,
            share: Number(((Number(item.amount) || 0) / denom).toFixed(2))
          };
        }),
        method: SplitMethods.PROPORTIONAL
      };
    });
  }

  static calculateSplits(sessionData, method = SplitMethods.PROPORTIONAL, options = {}) {
    const participants = sessionData.participants || [];
    const rawItems = sessionData.items || [];
    const totalAmount = Number(sessionData.totalAmount || 0);

    console.log(`🧮 [SPLIT ENGINE] Calculando ${method} para ${participants.length} participantes`);
    console.log(`💰 [SPLIT ENGINE] Total a dividir: $${totalAmount}`);

    if (participants.length === 0) {
      return {
        method,
        totalAmount,
        participants: [],
        summary: { participantCount: 0, averageAmount: 0 }
      };
    }

    const items = rawItems.map(it => ({
      ...it,
      amount: Number(it.amount) || 0,
      tax: Number(it.tax) || 0,
      tip: Number(it.tip) || 0,
      assignees: Array.isArray(it.assignees) ? it.assignees : parseAssignees(it.assignees)
    }));

    let splits = [];
    switch (method) {
      case SplitMethods.EQUAL:
        splits = this.calculateEqualSplit(totalAmount, participants);
        break;
      case SplitMethods.PROPORTIONAL:
      default:
        splits = this.calculateProportionalSplit(items, participants);
        break;
    }

    const calculatedTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    const averageAmount = splits.length > 0 ? calculatedTotal / splits.length : 0;

    const result = {
      method,
      totalAmount,
      calculatedTotal: Number(calculatedTotal.toFixed(2)),
      difference: Number((totalAmount - calculatedTotal).toFixed(2)),
      participants: splits,
      summary: {
        participantCount: participants.length,
        averageAmount: Number(averageAmount.toFixed(2)),
        highestAmount: Math.max(...splits.map(s => s.amount)),
        lowestAmount: Math.min(...splits.map(s => s.amount))
      }
    };

    console.log(`✅ [SPLIT ENGINE] Resultado:`, result.summary);
    return result;
  }
}

// 🔄 REAL-TIME: Función para broadcast de actualizaciones de sesión
const broadcastSessionUpdate = async (sessionId, updateType, data) => {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { participants: true, items: true, payments: true }
    });

    if (!session) return;

    const sessionWithParsedItems = {
      ...session,
      items: session.items.map(item => ({
        ...item,
        assignees: parseAssignees(item.assignees)
      }))
    };

    let splits = null;
    if (sessionWithParsedItems.participants.length > 0) {
      splits = SplitEngine.calculateSplits(sessionWithParsedItems, SplitMethods.PROPORTIONAL);
    }

    const updatePayload = {
      type: updateType,
      session: sessionWithParsedItems,
      splits,
      data,
      timestamp: new Date().toISOString(),
      connectedUsers: activeSessions.get(sessionId)?.users.size || 0
    };

    io.to(sessionId).emit('session-updated', updatePayload);
    console.log(`🔄 [BROADCAST] ${updateType} enviado a sesión ${sessionId} (${updatePayload.connectedUsers} usuarios)`);
  } catch (error) {
    console.error('🔥 [BROADCAST ERROR]', error);
  }
};

// Utility: moneda
const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(amount);

// Routes
app.get('/', (req, res) => {
  const connectedSessions = Array.from(activeSessions.entries()).map(([sessionId, data]) => ({
    sessionId,
    connectedUsers: data.users.size,
    lastActivity: data.lastActivity
  }));

  res.json({
    message: 'QRSplit API v3.0 - Real-time + Merchant Wallet',
    status: 'running',
    timestamp: new Date().toISOString(),
    realtime: {
      connectedSessions: activeSessions.size,
      totalConnectedUsers: Array.from(userSessions.values()).length,
      sessions: connectedSessions
    },
    features: [
      'Express.js',
      'Socket.io Real-time Sync',
      'PostgreSQL Database',
      'Prisma ORM',
      'CORS Enabled',
      'Security Headers',
      'Fixed Number Parsing',
      'Split Engine',
      'Live Session Updates',
      'Real-time Participant Tracking',
      'Auto-calculated Splits',
      'Merchant Wallet Support'
    ],
    endpoints: {
      health: '/health',
      sessions: '/api/sessions',
      payments: '/api/sessions/:id/pay',
      splits: '/api/sessions/:id/splits',
      paymentStatus: '/api/sessions/:id/payment-status',
      finalize: '/api/sessions/:id/finalize',
      merchantWallet: '/api/sessions/:id/merchant-wallet',
      realtime: 'Socket.io events available'
    },
    splitMethods: {
      equal: 'División igual entre todos',
      proportional: 'División por items consumidos',
      weighted: 'División con pesos personalizados',
      custom: 'Montos específicos por persona'
    },
    webLinkTemplate: `${FRONTEND_URL}/session/:sessionId`
  });
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$connect();
    const sessionCount = await prisma.session.count();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: 'connected',
        sessions: sessionCount
      },
      realtime: {
        status: 'active',
        connectedSessions: activeSessions.size,
        connectedUsers: userSessions.size
      }
    });
  } catch (error) {
    console.error("❌ [HEALTH] Error de conexión con DB:", error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ========================================
// SESSION MANAGEMENT ENDPOINTS
// ========================================

// 1️⃣ POST /api/sessions - acepta merchant_wallet y created_by
app.post('/api/sessions', async (req, res) => {
  try {
    console.log("📥 [POST /api/sessions] Body recibido:", req.body);

    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const merchantWallet = req.body.merchant_wallet 
      ? String(req.body.merchant_wallet).toLowerCase().trim()
      : null;
    const createdBy = req.body.created_by || null;

    const session = await prisma.session.create({
      data: {
        sessionId: sessionId,
        merchantId: req.body.merchant_id || 'default_merchant',
        merchantWallet: merchantWallet,
        createdBy: createdBy
      },
      include: { participants: true, items: true, payments: true }
    });

    activeSessions.set(sessionId, {
      users: new Set(),
      lastActivity: new Date(),
      createdAt: new Date()
    });

    console.log(`✅ Sesión creada en DB: ${sessionId}`);
    console.log(`💰 Merchant wallet: ${merchantWallet || 'No configurada'}`);

    const webLink = `${FRONTEND_URL}/session/${sessionId}`;

    
    try {
      const FRONTEND_URL = process.env.FRONTEND_URL || "https://qrsplit.vercel.app";

      res.json({
          success: true,
          session_id: sessionId,
          session,
          qr_code: `qrsplit://session/${sessionId}`,
          web_link: `${FRONTEND_URL}/session/${sessionId}`
      });
    } catch (error) {
      console.error("🔥 [ERROR /api/sessions] No se pudo crear la sesión:", error);
      res.status(500).json({ error: "Error interno al crear sesión" });
    }


  } catch (error) {
    console.error("🔥 [ERROR /api/sessions] No se pudo crear la sesión:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    console.log(`📡 [GET /api/sessions/${req.params.sessionId}]`);
    const session = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      include: { participants: true, items: true, payments: true }
    });

    if (!session) {
      console.warn("⚠️ Sesión no encontrada:", req.params.sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    const connectedUsers = activeSessions.get(req.params.sessionId)?.users.size || 0;

    const sessionWithParsedAssignees = {
      ...session,
      items: session.items.map(item => ({
        ...item,
        assignees: parseAssignees(item.assignees)
      }))
    };

    res.json({
      ...sessionWithParsedAssignees,
      realtime: {
        connectedUsers,
        isActive: connectedUsers > 0
      }
    });
  } catch (error) {
    console.error("🔥 [ERROR /api/sessions/:id]", error);
    res.status(500).json({ error: error.message });
  }
});

// 2️⃣ PUT /api/sessions/:sessionId/merchant-wallet
app.put('/api/sessions/:sessionId/merchant-wallet', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { walletAddress, userId } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const normalizedWallet = String(walletAddress).toLowerCase().trim();

    const session = await prisma.session.update({
      where: { sessionId },
      data: { 
        merchantWallet: normalizedWallet,
        updatedAt: new Date()
      }
    });

    console.log(`💰 [MERCHANT WALLET] Configurada para ${sessionId}: ${normalizedWallet}`);

    await broadcastSessionUpdate(sessionId, 'merchant-wallet-configured', {
      merchantWallet: normalizedWallet,
      userId,
      message: 'Wallet del comerciante configurada'
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('🔥 [ERROR /merchant-wallet]', error);
    res.status(500).json({ error: error.message });
  }
});

// 3️⃣ GET /api/sessions/:sessionId/payment-status
app.get('/api/sessions/:sessionId/payment-status', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: true,
        payments: true
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const totalParticipants = session.participants.length;
    const paidParticipants = new Set(
      session.payments
        .filter(p => p.status === 'success')
        .map(p => p.participantId)
    ).size;

    const totalCollected = session.payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const isFullyPaid = totalParticipants > 0 && paidParticipants === totalParticipants;

    const participantPayments = session.participants.map(participant => {
      const payment = session.payments.find(
        p => p.participantId === participant.id && p.status === 'success'
      );
      
      return {
        participantId: participant.id,
        userId: participant.userId,
        name: participant.name,
        walletAddress: participant.walletAddress,
        hasPaid: !!payment,
        amount: payment ? Number(payment.amount) : 0,
        txHash: payment?.txHash || null,
        paidAt: payment?.createdAt || null
      };
    });

    res.json({
      sessionId,
      merchantWallet: session.merchantWallet,
      totalParticipants,
      paidParticipants,
      totalCollected,
      totalAmount: Number(session.totalAmount),
      isFullyPaid,
      participants: participantPayments
    });
  } catch (error) {
    console.error('🔥 [ERROR /payment-status]', error);
    res.status(500).json({ error: error.message });
  }
});

// 4️⃣ POST /api/sessions/:sessionId/finalize
app.post('/api/sessions/:sessionId/finalize', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: true,
        payments: true
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const totalParticipants = session.participants.length;
    const paidParticipants = new Set(
      session.payments
        .filter(p => p.status === 'success')
        .map(p => p.participantId)
    ).size;

    if (paidParticipants !== totalParticipants) {
      return res.status(400).json({
        error: 'Not all participants have paid',
        paid: paidParticipants,
        total: totalParticipants
      });
    }

    const finalizedSession = await prisma.session.update({
      where: { sessionId },
      data: { 
        status: 'completed',
        updatedAt: new Date()
      }
    });

    await broadcastSessionUpdate(sessionId, 'session-finalized', {
      message: '¡Sesión completada! Todos los pagos han sido procesados',
      totalCollected: session.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    });

    res.json({ 
      success: true, 
      session: finalizedSession,
      message: 'Sesión finalizada exitosamente'
    });
  } catch (error) {
    console.error('🔥 [ERROR /finalize]', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Join con real-time broadcast (wallet normalizada)
app.post('/api/sessions/:sessionId/join', async (req, res) => {
  try {
    console.log(`👤 [JOIN SESSION] Usuario intentando unirse a: ${req.params.sessionId}`);
    console.log(`📥 [JOIN PAYLOAD] Datos recibidos:`, req.body);

    const participant = await prisma.participant.create({
      data: {
        sessionId: req.params.sessionId,
        userId: req.body.user_id || 'user_' + Date.now(),
        name: req.body.name || null,
        walletAddress: req.body.wallet_address
          ? String(req.body.wallet_address).toLowerCase().trim()
          : null,
        addedBy: req.body.added_by || req.body.user_id,
        isOperator: req.body.is_operator || false
      }
    });

    await prisma.session.update({
      where: { sessionId: req.params.sessionId },
      data: { participantsCount: { increment: 1 }, updatedAt: new Date() }
    });

    console.log(`✅ [JOIN SUCCESS] Participante creado:`, participant);

    await broadcastSessionUpdate(req.params.sessionId, 'participant-joined', {
      participant,
      message: `${participant.name || participant.userId} se unió a la sesión`
    });

    const session = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      include: { participants: true, items: true }
    });

    res.json({ success: true, participant, session });
  } catch (error) {
    console.error("🔥 [ERROR /join]", error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sessions/:sessionId/participants/:userId/wallet', async (req, res) => {
  try {
    const { sessionId, userId } = req.params;
    const { walletAddress, name } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address requerido" });
    }

    let participant = await prisma.participant.findFirst({ where: { sessionId, userId } });

    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          sessionId,
          userId,
          name: name || null,
          walletAddress: String(walletAddress).toLowerCase().trim(),
          addedBy: userId,
          isOperator: false
        }
      });

      await prisma.session.update({
        where: { sessionId },
        data: { participantsCount: { increment: 1 }, updatedAt: new Date() }
      });

      await broadcastSessionUpdate(sessionId, 'participant-joined', {
        participant,
        message: `${participant.name || participant.userId} se unió a la sesión`
      });
    }

    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: { walletAddress: String(walletAddress).toLowerCase().trim() }
    });

    console.log(`🔗 [WALLET UPDATED] ${userId} → ${walletAddress}`);

    await broadcastSessionUpdate(sessionId, 'wallet-updated', {
      participant: updated,
      message: `${updated.name || updated.userId} conectó su wallet`
    });

    res.json({ success: true, participant: updated });
  } catch (error) {
    console.error("🔥 [ERROR /update-wallet]", error);
    res.status(500).json({ error: error.message });
  }
});

// Agregar items con real-time broadcast
app.post('/api/sessions/:sessionId/items', async (req, res) => {
  try {
    console.log(`🧾 [ADD ITEM] ${req.body.name} → Sesión ${req.params.sessionId}`);
    console.log(`📥 [PAYLOAD] Datos recibidos:`, req.body);

    const amount = sanitizeNumber(req.body.amount);
    const tax = sanitizeNumber(req.body.tax || 0);
    const tip = sanitizeNumber(req.body.tip || 0);

    if (isNaN(amount) || amount <= 0) {
      console.warn("⚠️ Monto inválido recibido:", req.body.amount);
      return res.status(400).json({
        error: "El monto debe ser un número válido mayor a 0",
        received: req.body.amount,
        processed: amount
      });
    }

    const assigneesJson = JSON.stringify(req.body.assignees || []);

    const item = await prisma.item.create({
      data: {
        sessionId: req.params.sessionId,
        name: req.body.name,
        amount,
        tax,
        tip,
        assignees: assigneesJson
      }
    });

    const totalItemAmount = amount + tax + tip;
    console.log(`💰 [CALC] Ítem creado: ${req.body.name}`);
    console.log(`💰 [CALC] Monto: ${amount}, Tax: ${tax}, Tip: ${tip}`);
    console.log(`💰 [CALC] Total del ítem: ${totalItemAmount}`);

    const currentSession = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      select: { totalAmount: true }
    });

    const previousTotal = Number(currentSession?.totalAmount || 0);
    const newTotal = previousTotal + totalItemAmount;

    const updatedSession = await prisma.session.update({
      where: { sessionId: req.params.sessionId },
      data: { totalAmount: newTotal, updatedAt: new Date() },
      include: { participants: true, items: true }
    });

    let splits = null;
    if (updatedSession.participants.length > 0) {
      splits = SplitEngine.calculateSplits(updatedSession, SplitMethods.PROPORTIONAL);
      console.log(`🧮 [AUTO-SPLIT] Calculado automáticamente para ${updatedSession.participants.length} participantes`);
    }

    await broadcastSessionUpdate(req.params.sessionId, 'item-added', {
      item,
      newTotal: updatedSession.totalAmount,
      previousTotal,
      message: `${req.body.name} agregado por ${formatCurrency(amount)}`
    });

    res.json({
      success: true,
      item: { ...item, amount: Number(item.amount), tax: Number(item.tax), tip: Number(item.tip) },
      session: updatedSession,
      splits,
      debug: {
        originalAmount: req.body.amount,
        processedAmount: amount,
        totalCalculated: totalItemAmount
      }
    });

  } catch (error) {
    console.error("🔥 [ERROR /items]", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.put('/api/sessions/:sessionId/items/:itemId/assignees', async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { assignees } = req.body;

    console.log(`📝 [UPDATE ASSIGNEES] Item ${itemId} → Sesión ${sessionId}`);
    console.log(`👥 [ASSIGNEES] Nuevas asignaciones:`, assignees);

    if (!itemId || itemId.trim() === '') {
      console.error(`❌ [ERROR] itemId vacío o inválido: ${itemId}`);
      return res.status(400).json({ error: `itemId inválido: ${itemId}` });
    }

    const existingItem = await prisma.item.findFirst({ where: { id: itemId, sessionId } });
    if (!existingItem) {
      console.error(`❌ [ERROR] Item ${itemId} no encontrado en sesión ${sessionId}`);
      return res.status(404).json({ error: `Item ${itemId} no encontrado en esta sesión` });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { assignees: JSON.stringify(assignees || []) }
    });

    console.log(`✅ [UPDATED] Item actualizado:`, updatedItem);

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { participants: true, items: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    let splits = null;
    if (session.participants.length > 0) {
      splits = SplitEngine.calculateSplits(session, SplitMethods.PROPORTIONAL);
      console.log(`🧮 [AUTO-SPLIT] Recalculado después de cambiar asignaciones`);
    }

    await broadcastSessionUpdate(sessionId, 'item-assignees-updated', {
      item: updatedItem,
      previousAssignees: req.body.previousAssignees || [],
      newAssignees: assignees,
      message: `Asignaciones actualizadas para ${updatedItem.name}`
    });

    res.json({ success: true, item: updatedItem, session, splits });
  } catch (error) {
    console.error("🔥 [ERROR /items/:id/assignees]", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/sessions/:sessionId/calculate-splits', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { method = SplitMethods.PROPORTIONAL, options = {} } = req.body;

    console.log(`🧮 [CALCULATE SPLITS] Sesión: ${sessionId}, Método: ${method}`);

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { participants: true, items: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const splits = SplitEngine.calculateSplits(session, method, options);

    await broadcastSessionUpdate(sessionId, 'splits-calculated', {
      splits,
      method,
      message: `División calculada usando método ${method}`
    });

    res.json({ success: true, splits, session: { ...session, splits } });

  } catch (error) {
    console.error('🔥 [ERROR /calculate-splits]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:sessionId/splits', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      include: { participants: true, items: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const splits = SplitEngine.calculateSplits(session, SplitMethods.PROPORTIONAL);
    res.json({ success: true, splits });
  } catch (error) {
    console.error('🔥 [ERROR /splits]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:sessionId/connected-users', (req, res) => {
  const sessionData = activeSessions.get(req.params.sessionId);

  if (!sessionData) {
    return res.json({ connectedUsers: 0, users: [], isActive: false });
  }

  const connectedUsersList = Array.from(userSessions.entries())
    .filter(([_, userData]) => userData.sessionId === req.params.sessionId)
    .map(([socketId, userData]) => ({
      socketId,
      userId: userData.userId,
      userName: userData.userName,
      connectedAt: userData.connectedAt
    }));

  res.json({
    connectedUsers: sessionData.users.size,
    users: connectedUsersList,
    isActive: sessionData.users.size > 0,
    lastActivity: sessionData.lastActivity
  });
});

// ========================================
//  POST /api/sessions/:sessionId/pay - paga al merchantWallet
// ========================================
app.post('/api/sessions/:sessionId/pay', async (req, res) => {
  try {
    const { sessionId } = req.params;
    let { user_id, wallet_address, amount, token_address } = req.body;

    wallet_address = wallet_address ? String(wallet_address).toLowerCase().trim() : null;
    user_id = user_id ? String(user_id).trim() : null;
    amount = Number(amount ?? 0);

    console.log('💳 [PAY] payload =', { sessionId, user_id, wallet_address, amount });

    // Obtener sesión con merchantWallet
    const session = await prisma.session.findUnique({ 
      where: { sessionId },
      select: { merchantWallet: true }
    });
    
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    // Validar que haya merchant wallet configurada
    if (!session.merchantWallet) {
      return res.status(400).json({ 
        error: 'Merchant wallet not configured for this session',
        message: 'El creador de la sesión debe conectar su wallet primero'
      });
    }

    const participant = await prisma.participant.findFirst({
      where: {
        sessionId,
        OR: [
          wallet_address ? { walletAddress: wallet_address } : undefined,
          user_id ? { userId: user_id } : undefined
        ].filter(Boolean)
      }
    });

    if (!participant) {
      console.warn('⚠️ [PAY] Participant not found', { sessionId, user_id, wallet_address });
      return res.status(404).json({
        error: 'Participant not found',
        debug: { sessionId, tried_userId: user_id, tried_wallet: wallet_address }
      });
    }

    // TODO: llamada real a smart contract de Starknet aquí
    const txHash = '0x' + Math.random().toString(16).slice(2); // mock por ahora

    const payment = await prisma.payment.create({
      data: {
        sessionId,
        participantId: participant.id,
        fromAddress: wallet_address ?? 'unknown',
        toAddress: session.merchantWallet, // paga al merchant
        amount,
        tokenAddress: (token_address || process.env.TOKEN_ADDRESS || 'ETH').toLowerCase(),
        status: 'success',
        txHash
      }
    });

    console.log(`✅ [PAYMENT SUCCESS] ${wallet_address} → ${session.merchantWallet}: ${amount}`);

    await broadcastSessionUpdate(sessionId, 'payment-made', {
      payment,
      participant: {
        id: participant.id,
        name: participant.name,
        userId: participant.userId
      },
      merchantWallet: session.merchantWallet,
      message: `${participant.name || participant.userId} pagó ${formatCurrency(amount)}`
    });

    res.json({ 
      success: true, 
      txHash, 
      payment, 
      participantId: participant.id,
      merchantWallet: session.merchantWallet 
    });
  } catch (error) {
    console.error('🔥 [ERROR /pay]', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// SOCKET.IO REAL-TIME
// ========================================
io.on('connection', (socket) => {
  console.log(`🔌 Usuario conectado: ${socket.id}`);

  socket.on('join-session', async (data) => {
    const { sessionId, userId, userName } = data;
    console.log(`👥 Usuario ${socket.id} (${userName || userId}) se unió a sesión ${sessionId}`);

    socket.join(sessionId);

    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        users: new Set(),
        lastActivity: new Date(),
        createdAt: new Date()
      });
    }

    const sessionData = activeSessions.get(sessionId);
    sessionData.users.add(socket.id);
    sessionData.lastActivity = new Date();

    userSessions.set(socket.id, {
      sessionId,
      userId: userId || socket.id,
      userName: userName || `User ${socket.id.slice(-4)}`,
      connectedAt: new Date()
    });

    socket.to(sessionId).emit('user-connected', {
      userId: userId || socket.id,
      userName: userName || `User ${socket.id.slice(-4)}`,
      connectedUsers: sessionData.users.size,
      timestamp: new Date().toISOString()
    });

    try {
      const session = await prisma.session.findUnique({
        where: { sessionId },
        include: { participants: true, items: true }
      });

      if (session && session.participants.length > 0) {
        const splits = SplitEngine.calculateSplits(session, SplitMethods.PROPORTIONAL);
        socket.emit('session-sync', { session, splits, connectedUsers: sessionData.users.size });
      }
    } catch (error) {
      console.error('🔥 [SOCKET ERROR] Error sincronizando sesión:', error);
    }
  });

  socket.on('leave-session', (sessionId) => {
    console.log(`👋 Usuario ${socket.id} salió de sesión ${sessionId}`);
    socket.leave(sessionId);

    const userData = userSessions.get(socket.id);
    if (userData && activeSessions.has(sessionId)) {
      const sessionData = activeSessions.get(sessionId);
      sessionData.users.delete(socket.id);

      socket.to(sessionId).emit('user-disconnected', {
        userId: userData.userId,
        userName: userData.userName,
        connectedUsers: sessionData.users.size,
        timestamp: new Date().toISOString()
      });

      if (sessionData.users.size === 0) {
        activeSessions.delete(sessionId);
        console.log(`🧹 Sesión ${sessionId} limpiada (sin usuarios)`);
      }
    }

    userSessions.delete(socket.id);
  });

  socket.on('typing-start', (data) => {
    const userData = userSessions.get(socket.id);
    if (userData) {
      socket.to(userData.sessionId).emit('user-typing', {
        userId: userData.userId,
        userName: userData.userName,
        action: data.action || 'typing',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('typing-stop', () => {
    const userData = userSessions.get(socket.id);
    if (userData) {
      socket.to(userData.sessionId).emit('user-stopped-typing', {
        userId: userData.userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${socket.id}`);

    const userData = userSessions.get(socket.id);
    if (userData && activeSessions.has(userData.sessionId)) {
      const sessionData = activeSessions.get(userData.sessionId);
      sessionData.users.delete(socket.id);

      socket.to(userData.sessionId).emit('user-disconnected', {
        userId: userData.userId,
        userName: userData.userName,
        connectedUsers: sessionData.users.size,
        timestamp: new Date().toISOString()
      });

      if (sessionData.users.size === 0) {
        activeSessions.delete(userData.sessionId);
        console.log(`🧹 Sesión ${userData.sessionId} limpiada (sin usuarios)`);
      }
    }

    userSessions.delete(socket.id);
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// ========================================
// ERROR HANDLERS
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /',
      'GET /health',
      'POST /api/sessions',
      'GET /api/sessions/:id',
      'GET /api/sessions/:id/connected-users',
      'GET /api/sessions/:id/payment-status',
      'PUT /api/sessions/:id/merchant-wallet',
      'POST /api/sessions/:id/finalize',
      'POST /api/sessions/:id/join',
      'PUT /api/sessions/:id/participants/:userId/wallet',
      'POST /api/sessions/:id/items',
      'PUT /api/sessions/:id/items/:itemId/assignees',
      'GET /api/sessions/:id/splits',
      'POST /api/sessions/:id/calculate-splits',
      'POST /api/sessions/:id/pay'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  io.emit('server-shutdown', {
    message: 'Servidor cerrándose, reconectando automáticamente...',
    timestamp: new Date().toISOString()
  });
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
  });
});

// Limpiar sesiones inactivas cada 5 minutos
setInterval(() => {
  const now = new Date();
  const inactiveThreshold = 30 * 60 * 1000;
  for (const [sessionId, sessionData] of activeSessions.entries()) {
    if (sessionData.users.size === 0 && (now - sessionData.lastActivity) > inactiveThreshold) {
      activeSessions.delete(sessionId);
      console.log(`🧹 [CLEANUP] Sesión inactiva eliminada: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000);

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // 👈 necesario para Render

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('✅ QRSplit Express API v3.0 - Real-time + Merchant Wallet!');
  console.log(`🚀 Servidor corriendo en: http://${HOST}:${PORT}`);
  console.log(`🔄 Socket.io habilitado para real-time sync`);
  console.log(`🐘 PostgreSQL conectado via Prisma ORM`);
  console.log(`🧮 Split Engine activado`);
  console.log(`💰 Merchant Wallet Support habilitado`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /                        - Info de la API');
  console.log('   GET  /health                  - Health check');
  console.log('   POST /api/sessions            - Crear sesión (con merchant_wallet)');
  console.log('   GET  /api/sessions/:id        - Obtener sesión');
  console.log('   GET  /api/sessions/:id/connected-users - Usuarios conectados');
  console.log('   GET  /api/sessions/:id/payment-status  - Estado de pagos 💰');
  console.log('   PUT  /api/sessions/:id/merchant-wallet - Configurar merchant wallet 💰');
  console.log('   POST /api/sessions/:id/finalize        - Finalizar sesión 💰');
  console.log('   POST /api/sessions/:id/join   - Unirse a sesión');
  console.log('   PUT  /api/sessions/:id/participants/:userId/wallet - Actualizar wallet');
  console.log('   POST /api/sessions/:id/items  - Agregar item');
  console.log('   PUT  /api/sessions/:id/items/:itemId/assignees - Actualizar asignaciones');
  console.log('   GET  /api/sessions/:id/splits - Obtener splits');
  console.log('   POST /api/sessions/:id/calculate-splits - Calcular splits');
  console.log('   POST /api/sessions/:id/pay    - Pagar (paga al merchantWallet) 💰');
  console.log('');
  console.log('🔄 Socket.io Events disponibles:');
  console.log('   session-updated          → Cambios en la sesión');
  console.log('   participant-joined       → Nuevo participante');
  console.log('   item-added               → Nuevo item agregado');
  console.log('   payment-made             → Pago realizado 💰');
  console.log('   merchant-wallet-configured → Wallet configurada 💰');
  console.log('   session-finalized        → Sesión completada 💰');
  console.log('   splits-calculated        → División calculada');
  console.log('   user-connected           → Usuario se conectó');
  console.log('   user-disconnected        → Usuario se desconectó');
  console.log('   user-typing              → Usuario escribiendo');
  console.log('');
  console.log('🧮 Métodos de división soportados: equal | proportional | weighted | custom');
  console.log('');
  console.log('🎯 Ready para recibir requests y conexiones real-time!');
  console.log('💰 Merchant Wallet Flow: Creador recibe todos los pagos!');
});
