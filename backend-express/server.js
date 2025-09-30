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
const parseAssignees = (assigneesString) => {
  try {
    return JSON.parse(assigneesString || '[]');
  } catch {
    return [];
  }
};

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});



// 🔄 REAL-TIME: Store para sesiones activas y usuarios conectados
const activeSessions = new Map(); // sessionId -> { users: Set, lastActivity: Date }
const userSessions = new Map(); // socketId -> { sessionId, userId, userName }

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3001", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Función corregida: Sanitización de números
const sanitizeNumber = (value) => {
  if (value === null || value === undefined) return 0;

  let str = String(value).trim();
  
  console.log(`🔢 [DEBUG] Valor original recibido: "${value}"`);

  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
    console.log(`🔢 [COMA DETECTADA] Convertido a: "${str}"`);
  } 
  else if (str.includes('.')) {
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

// SPLIT ENGINE - Clase principal
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

    items.forEach(item => {
      const itemTotal = Number(item.amount) + Number(item.tax || 0) + Number(item.tip || 0);
      grandTotal += itemTotal;

      if (!item.assignees || item.assignees.length === 0) {
        const amountPerPerson = itemTotal / participants.length;
        participants.forEach(p => {
          const current = participantTotals.get(p.id) || 0;
          participantTotals.set(p.id, current + amountPerPerson);
        });
      } else {
        const amountPerAssignee = itemTotal / item.assignees.length;
        item.assignees.forEach(assigneeId => {
          if (participantTotals.has(assigneeId)) {
            const current = participantTotals.get(assigneeId) || 0;
            participantTotals.set(assigneeId, current + amountPerAssignee);
          }
        });
      }
    });

    return participants.map(participant => {
      const amount = participantTotals.get(participant.id) || 0;
      const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
      
      const participantItems = items.filter(item => {
        if (!item.assignees || item.assignees.length === 0) return true;
        return item.assignees.includes(participant.id);
      });

      return {
        participantId: participant.id,
        userId: participant.userId,
        name: participant.name || `User ${participant.userId}`,
        amount: Number(amount.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
        items: participantItems.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number(item.amount),
          share: item.assignees && item.assignees.length > 0 
            ? Number((Number(item.amount) / item.assignees.length).toFixed(2))
            : Number((Number(item.amount) / participants.length).toFixed(2))
        })),
        method: SplitMethods.PROPORTIONAL
      };
    });
  }

  static calculateSplits(sessionData, method = SplitMethods.PROPORTIONAL, options = {}) {
    const { participants, items } = sessionData;
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

    let splits = [];

    switch (method) {
      case SplitMethods.EQUAL:
        splits = this.calculateEqualSplit(totalAmount, participants);
        break;
      
      case SplitMethods.PROPORTIONAL:
        splits = this.calculateProportionalSplit(items, participants);
        break;
      
      default:
        splits = this.calculateProportionalSplit(items, participants);
    }

    const calculatedTotal = splits.reduce((sum, split) => sum + split.amount, 0);
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
    // Obtener sesión completa actualizada
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: true,
        items: true,
        payments: true
      }
    });

    if (!session) return;

    // Calcular splits automáticamente si hay participantes
    // Parsear assignees para todas las sesiones
    const sessionWithParsedItems = {
      ...session,
      items: session.items.map(item => ({
        ...item,
        assignees: parseAssignees(item.assignees)
      }))
    };

    // Calcular splits automáticamente si hay participantes
    let splits = null;
    if (sessionWithParsedItems.participants.length > 0) {
      splits = SplitEngine.calculateSplits(sessionWithParsedItems, SplitMethods.PROPORTIONAL);
    }

    const updatePayload = {
      type: updateType,
      session,
      splits,
      data,
      timestamp: new Date().toISOString(),
      connectedUsers: activeSessions.get(sessionId)?.users.size || 0
    };

    // Broadcast a todos los usuarios de la sesión
    io.to(sessionId).emit('session-updated', updatePayload);
    
    console.log(`🔄 [BROADCAST] ${updateType} enviado a sesión ${sessionId} (${updatePayload.connectedUsers} usuarios)`);

  } catch (error) {
    console.error('🔥 [BROADCAST ERROR]', error);
  }
};

// Routes
app.get('/', (req, res) => {
  const connectedSessions = Array.from(activeSessions.entries()).map(([sessionId, data]) => ({
    sessionId,
    connectedUsers: data.users.size,
    lastActivity: data.lastActivity
  }));

  res.json({ 
    message: 'QRSplit API v3.0 - Real-time Enabled', 
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
      'Auto-calculated Splits'
    ],
    endpoints: {
      health: '/health',
      sessions: '/api/sessions',
      payments: '/api/payments',
      splits: '/api/sessions/:id/splits',
      realtime: 'Socket.io events available'
    },
    splitMethods: {
      equal: 'División igual entre todos',
      proportional: 'División por items consumidos',
      weighted: 'División con pesos personalizados',
      custom: 'Montos específicos por persona'
    }
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
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Session management endpoints
app.post('/api/sessions', async (req, res) => {
  try {
    console.log("📥 [POST /api/sessions] Body recibido:", req.body);

    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const session = await prisma.session.create({
      data: {
        sessionId: sessionId,
        merchantId: req.body.merchant_id || 'default_merchant'
      },
      include: {
        participants: true,
        items: true,
        payments: true
      }
    });

    // 🔄 REAL-TIME: Inicializar tracking de sesión
    activeSessions.set(sessionId, {
      users: new Set(),
      lastActivity: new Date(),
      createdAt: new Date()
    });

    console.log(`✅ Sesión creada en DB: ${sessionId}`);

    res.json({
      success: true,
      session_id: sessionId,
      session,
      qr_code: `qrsplit://session/${sessionId}`,
      web_link: `http://localhost:3001/session/${sessionId}`
    });

  } catch (error) {
    console.error("🔥 [ERROR /api/sessions] No se pudo crear la sesión:");
    console.error(error);
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
      include: {
        participants: true,
        items: true,
        payments: true
      }
    });

    if (!session) {
      console.warn("⚠️ Sesión no encontrada:", req.params.sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    // 🔄 REAL-TIME: Incluir info de usuarios conectados
    const connectedUsers = activeSessions.get(req.params.sessionId)?.users.size || 0;
    
    // Parsear assignees antes de devolver
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

// 🔄 MEJORADO: Join con real-time broadcast
app.post('/api/sessions/:sessionId/join', async (req, res) => {
  try {
    console.log(`👤 [JOIN SESSION] Usuario intentando unirse a: ${req.params.sessionId}`);
    console.log(`📥 [JOIN PAYLOAD] Datos recibidos:`, req.body);
    
    const participant = await prisma.participant.create({
      data: {
        sessionId: req.params.sessionId,
        userId: req.body.user_id || 'user_' + Date.now(),
        name: req.body.name || null,
        walletAddress: req.body.wallet_address || null,
        addedBy: req.body.added_by || req.body.user_id,
        isOperator: req.body.is_operator || false
      }
    });

    await prisma.session.update({
      where: { sessionId: req.params.sessionId },
      data: { 
        participantsCount: { increment: 1 },
        updatedAt: new Date()
      }
    });

    console.log(`✅ [JOIN SUCCESS] Participante creado:`, participant);

    // 🔄 REAL-TIME: Broadcast del nuevo participante
    await broadcastSessionUpdate(req.params.sessionId, 'participant-joined', {
      participant,
      message: `${participant.name || participant.userId} se unió a la sesión`
    });

    const session = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      include: { participants: true, items: true }
    });

    res.json({
      success: true,
      participant,
      session
    });
  } catch (error) {
    console.error("🔥 [ERROR /join]", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 MEJORADO: Agregar items con real-time broadcast
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
      data: {
        totalAmount: newTotal,
        updatedAt: new Date()
      },
      include: { participants: true, items: true }
    });

    // ✨ AUTO-CALCULAR SPLITS cuando se agrega un item
    let splits = null;
    if (updatedSession.participants.length > 0) {
      splits = SplitEngine.calculateSplits(updatedSession, SplitMethods.PROPORTIONAL);
      console.log(`🧮 [AUTO-SPLIT] Calculado automáticamente para ${updatedSession.participants.length} participantes`);
    }

    // 🔄 REAL-TIME: Broadcast del nuevo item
    await broadcastSessionUpdate(req.params.sessionId, 'item-added', {
      item,
      newTotal: updatedSession.totalAmount,
      previousTotal,
      message: `${req.body.name} agregado por ${formatCurrency(amount)}`
    });

    res.json({
      success: true,
      item: {
        ...item,
        amount: Number(item.amount),
        tax: Number(item.tax),
        tip: Number(item.tip)
      },
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

// Reemplazar el endpoint PUT /api/sessions/:sessionId/items/:itemId/assignees en server.js

app.put('/api/sessions/:sessionId/items/:itemId/assignees', async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { assignees } = req.body;

    console.log(`📝 [UPDATE ASSIGNEES] Item ${itemId} → Sesión ${sessionId}`);
    console.log(`👥 [ASSIGNEES] Nuevas asignaciones:`, assignees);
    console.log(`🔍 [DEBUG] itemId type:`, typeof itemId, 'value:', itemId);

    // Validar que itemId no esté vacío
    if (!itemId || itemId.trim() === '') {
      console.error(`❌ [ERROR] itemId vacío o inválido: ${itemId}`);
      return res.status(400).json({ error: `itemId inválido: ${itemId}` });
    }

    // Verificar que el item existe y pertenece a la sesión
    const existingItem = await prisma.item.findFirst({
      where: {
        id: itemId,  // Usar itemId como string directamente
        sessionId: sessionId
      }
    });

    if (!existingItem) {
      console.error(`❌ [ERROR] Item ${itemId} no encontrado en sesión ${sessionId}`);
      return res.status(404).json({ error: `Item ${itemId} no encontrado en esta sesión` });
    }

    console.log(`✅ [FOUND] Item existente:`, existingItem);

    // Actualizar item en la base de datos
    const updatedItem = await prisma.item.update({
      where: { 
        id: itemId  // Usar itemId como string directamente
      },
      data: {
        assignees: JSON.stringify(assignees || [])
      }
    });

    console.log(`✅ [UPDATED] Item actualizado:`, updatedItem);

    // Obtener sesión completa actualizada
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: true,
        items: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ✨ AUTO-CALCULAR SPLITS cuando se cambian asignaciones
    let splits = null;
    if (session.participants.length > 0) {
      splits = SplitEngine.calculateSplits(session, SplitMethods.PROPORTIONAL);
      console.log(`🧮 [AUTO-SPLIT] Recalculado después de cambiar asignaciones`);
    }

    // 🔄 REAL-TIME: Broadcast del cambio de asignaciones
    await broadcastSessionUpdate(sessionId, 'item-assignees-updated', {
      item: updatedItem,
      previousAssignees: req.body.previousAssignees || [],
      newAssignees: assignees,
      message: `Asignaciones actualizadas para ${updatedItem.name}`
    });

    res.json({
      success: true,
      item: updatedItem,
      session,
      splits
    });

  } catch (error) {
    console.error("🔥 [ERROR /items/:id/assignees]", error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 🔄 MEJORADO: Calcular splits con real-time
app.post('/api/sessions/:sessionId/calculate-splits', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { method = SplitMethods.PROPORTIONAL, options = {} } = req.body;

    console.log(`🧮 [CALCULATE SPLITS] Sesión: ${sessionId}, Método: ${method}`);

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: true,
        items: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const splits = SplitEngine.calculateSplits(session, method, options);

    // 🔄 REAL-TIME: Broadcast de los splits calculados
    await broadcastSessionUpdate(sessionId, 'splits-calculated', {
      splits,
      method,
      message: `División calculada usando método ${method}`
    });

    res.json({
      success: true,
      splits,
      session: {
        ...session,
        splits
      }
    });

  } catch (error) {
    console.error('🔥 [ERROR /calculate-splits]', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener splits existentes
app.get('/api/sessions/:sessionId/splits', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId: req.params.sessionId },
      include: {
        participants: true,
        items: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ✅ Parsear assignees de cada item antes de pasar al SplitEngine
    const sessionWithParsedItems = {
      ...session,
      items: session.items.map(item => ({
        ...item,
        assignees: parseAssignees(item.assignees)
      }))
    };

    const splits = SplitEngine.calculateSplits(sessionWithParsedItems, SplitMethods.PROPORTIONAL);

    res.json({
      success: true,
      splits
    });

  } catch (error) {
    console.error('🔥 [ERROR /splits]', error);
    res.status(500).json({ error: error.message });
  }
});


// 🔄 NUEVO: Endpoint para obtener usuarios conectados en tiempo real
app.get('/api/sessions/:sessionId/connected-users', (req, res) => {
  const sessionData = activeSessions.get(req.params.sessionId);
  
  if (!sessionData) {
    return res.json({
      connectedUsers: 0,
      users: [],
      isActive: false
    });
  }

  const connectedUsersList = Array.from(userSessions.entries())
    .filter(([socketId, userData]) => userData.sessionId === req.params.sessionId)
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

// Utility function para formatear moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS',
    minimumFractionDigits: 2 
  }).format(amount);
};

// Endpoint para testing del Split Engine
app.post('/api/test/splits', (req, res) => {
  const { testData, method = SplitMethods.PROPORTIONAL, options = {} } = req.body;
  
  const defaultTestData = {
    totalAmount: 100,
    participants: [
      { id: 1, userId: 'user1', name: 'Alice' },
      { id: 2, userId: 'user2', name: 'Bob' },
      { id: 3, userId: 'user3', name: 'Charlie' }
    ],
    items: [
      { id: 1, name: 'Pizza', amount: 60, assignees: [1, 2] },
      { id: 2, name: 'Bebidas', amount: 40, assignees: [1, 2, 3] }
    ]
  };

  const sessionData = testData || defaultTestData;
  const result = SplitEngine.calculateSplits(sessionData, method, options);

  res.json({
    message: 'Split Engine Test',
    input: sessionData,
    method,
    options,
    result
  });
});

// Endpoint de testing de números
app.post('/api/test/numbers', (req, res) => {
  const testCases = [
    '2.000',
    '2.000,50',
    '2000.50',
    '1.234.567',
    '500',
    '10,99',
    '1.500.000,75'
  ];

  const results = testCases.map(test => ({
    input: test,
    output: sanitizeNumber(test),
    formatted: formatCurrency(sanitizeNumber(test))
  }));

  if (req.body.test_value) {
    results.push({
      input: req.body.test_value,
      output: sanitizeNumber(req.body.test_value),
      formatted: formatCurrency(sanitizeNumber(req.body.test_value))
    });
  }

  res.json({
    message: 'Pruebas de sanitización de números',
    results
  });
});

// 🔄 SOCKET.IO REAL-TIME MEJORADO
io.on('connection', (socket) => {
  console.log(`🔌 Usuario conectado: ${socket.id}`);
  
  // Usuario se une a una sesión
  socket.on('join-session', async (data) => {
    const { sessionId, userId, userName } = data;
    
    console.log(`👥 Usuario ${socket.id} (${userName || userId}) se unió a sesión ${sessionId}`);
    
    // Join al room de Socket.io
    socket.join(sessionId);
    
    // Actualizar tracking
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
    
    // Notificar a otros usuarios de la sesión
    socket.to(sessionId).emit('user-connected', {
      userId: userId || socket.id,
      userName: userName || `User ${socket.id.slice(-4)}`,
      connectedUsers: sessionData.users.size,
      timestamp: new Date().toISOString()
    });
    
    // Enviar estado actual al usuario recién conectado
    try {
      const session = await prisma.session.findUnique({
        where: { sessionId },
        include: {
          participants: true,
          items: true
        }
      });
      
      if (session && session.participants.length > 0) {
        const splits = SplitEngine.calculateSplits(session, SplitMethods.PROPORTIONAL);
        socket.emit('session-sync', {
          session,
          splits,
          connectedUsers: sessionData.users.size
        });
      }
    } catch (error) {
      console.error('🔥 [SOCKET ERROR] Error sincronizando sesión:', error);
    }
  });
  
  // Usuario sale de sesión
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
      
      // Limpiar sesión si no hay usuarios
      if (sessionData.users.size === 0) {
        activeSessions.delete(sessionId);
        console.log(`🧹 Sesión ${sessionId} limpiada (sin usuarios)`);
      }
    }
    
    userSessions.delete(socket.id);
  });
  
  // Typing indicators para colaboración
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
  
  // Manejo de desconexión
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
      
      // Limpiar sesión si no hay usuarios
      if (sessionData.users.size === 0) {
        activeSessions.delete(userData.sessionId);
        console.log(`🧹 Sesión ${userData.sessionId} limpiada (sin usuarios)`);
      }
    }
    
    userSessions.delete(socket.id);
  });
  
  // Heartbeat para mantener conexión
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});


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
      'POST /api/sessions/:id/join',
      'POST /api/sessions/:id/items',
      'PUT /api/sessions/:id/items/:itemId/assignees', // ← NUEVO
      'GET /api/sessions/:id/splits',
      'POST /api/sessions/:id/calculate-splits',
      'POST /api/test/numbers',
      'POST /api/test/splits'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Notificar a todos los usuarios conectados
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
  const inactiveThreshold = 30 * 60 * 1000; // 30 minutos
  
  for (const [sessionId, sessionData] of activeSessions.entries()) {
    if (sessionData.users.size === 0 && (now - sessionData.lastActivity) > inactiveThreshold) {
      activeSessions.delete(sessionId);
      console.log(`🧹 [CLEANUP] Sesión inactiva eliminada: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('✅ QRSplit Express API v3.0 con Real-time completo!');
  console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🔄 Socket.io habilitado para real-time sync`);
  console.log(`🐘 PostgreSQL conectado via Prisma ORM`);
  console.log(`🧮 Split Engine activado`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /                        - Info de la API');
  console.log('   GET  /health                  - Health check');
  console.log('   POST /api/sessions            - Crear sesión');
  console.log('   GET  /api/sessions/:id        - Obtener sesión');
  console.log('   GET  /api/sessions/:id/connected-users - Usuarios conectados');
  console.log('   POST /api/sessions/:id/join   - Unirse a sesión');
  console.log('   POST /api/sessions/:id/items  - Agregar item');
  console.log('   GET  /api/sessions/:id/splits - Obtener splits');
  console.log('   POST /api/sessions/:id/calculate-splits - Calcular splits');
  console.log('   POST /api/test/numbers        - Test números');
  console.log('   POST /api/test/splits         - Test splits');
  console.log('');
  console.log('🔄 Socket.io Events disponibles:');
  console.log('   join-session     → Unirse a sesión en tiempo real');
  console.log('   leave-session    → Salir de sesión');
  console.log('   typing-start     → Indicador de escritura');
  console.log('   typing-stop      → Parar indicador');
  console.log('   ping/pong        → Heartbeat para conexión');
  console.log('');
  console.log('📡 Real-time Updates automáticos:');
  console.log('   session-updated  → Cambios en la sesión');
  console.log('   participant-joined → Nuevo participante');
  console.log('   item-added       → Nuevo item agregado');
  console.log('   splits-calculated → División calculada');
  console.log('   user-connected   → Usuario se conectó');
  console.log('   user-disconnected → Usuario se desconectó');
  console.log('   user-typing      → Usuario escribiendo');
  console.log('');
  console.log('🧮 Métodos de división soportados:');
  console.log('   equal        → División igual entre todos');
  console.log('   proportional → División por items consumidos');
  console.log('   weighted     → División con pesos personalizados');
  console.log('   custom       → Montos específicos por persona');
  console.log('');
  console.log('🎯 Ready para recibir requests y conexiones real-time!');
});