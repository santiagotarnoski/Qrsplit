'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  QrCode,
  Users,
  Plus,
  DollarSign,
  Calculator,
  User,
  Check,
  X,
  Wifi,
  WifiOff,
  Bell,
  Wallet,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Shield,
  Zap,
  Copy as CopyIcon, // ← alias para evitar ReferenceError
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { WalletButton } from '../../components/WalletButton';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import { useSearchParams } from 'next/navigation';
import Plasma from '../plasma';

// ========= Tipos =========
interface Participant {
  id: number | string;
  userId: string;
  name?: string;
  walletAddress?: string;
  addedBy?: string;
  isOperator?: boolean;
}
interface Item {
  id: number | string;
  name: string;
  amount: number;
  tax?: number;
  tip?: number;
  assignees?: (number | string)[];
}
interface Session {
  id: string;
  sessionId: string;
  merchantId: string;
  status: string;
  totalAmount: string;
  participantsCount: number;
  createdAt: string;
  participants: Participant[];
  items: Item[];
  payments: any[];
  blockchainSessionId?: string; // ← AGREGAR
}
interface Split {
  participantId: number | string;
  userId: string;
  name: string;
  amount: number;
  percentage: number;
  items: any[];
  method: string;
}
interface SplitData {
  method: string;
  totalAmount: number;
  calculatedTotal: number;
  difference: number;
  participants: Split[];
  summary: {
    participantCount: number;
    averageAmount: number;
    highestAmount: number;
    lowestAmount: number;
  };
}

// ========= Helpers =========
const getStableUserId = () => {
  if (typeof window === 'undefined') {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  const KEY = 'qrsplit_user_id';
  let uid = localStorage.getItem(KEY);
  if (!uid) {
    uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(KEY, uid);
  }
  return uid;
};
const parseAssigneesSafe = (assignees: any): (number | string)[] => {
  if (Array.isArray(assignees)) return assignees;
  if (typeof assignees === 'string') {
    try {
      const parsed = JSON.parse(assignees);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(amount);

// ========= UI: Notificaciones =========
const RealtimeNotifications = ({
  isConnected,
  connectedUsers,
  notifications,
  onRemoveNotification,
  onClearNotifications,
}: any) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) setShowNotifications(true);
  }, [notifications.length]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <div className="flex items-center justify-end space-x-2">
        <Badge
          className={`${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              Real-time ON
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-2" />
              Conectando...
            </>
          )}
        </Badge>

        {isConnected && connectedUsers.length > 0 && (
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
            <Users className="w-3 h-3 mr-2" />
            {connectedUsers.length} online
          </Badge>
        )}

        {notifications.length > 0 && (
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full hover:from-purple-600 hover:to-cyan-600 transition-all shadow-lg"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notifications.length}
            </span>
          </button>
        )}
      </div>

      {showNotifications && notifications.length > 0 && (
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Actualizaciones
            </h3>
            <div className="flex space-x-1">
              <button onClick={onClearNotifications} className="text-slate-400 hover:text-slate-200 text-sm">
                Limpiar
              </button>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((notification: string, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm"
              >
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-200">{notification}</span>
                </div>
                <button onClick={() => onRemoveNotification(index)} className="text-slate-400 hover:text-slate-200 ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========= QR personalizado =========
const CustomQRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current || !value) return;
      try {
        const QRCode = (await import('qrcode')).default;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          color: { dark: '#00D9A0', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };
    generateQR();
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-xl" style={{ maxWidth: '100%', height: 'auto' }} />;
};

// ========= Página =========
export default function QRSplitApp() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('checking...');
  const [merchantId, setMerchantId] = useState('demo_merchant');
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<(number | string)[]>([]);
  const [splits, setSplits] = useState<SplitData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [currentUserId] = useState<string>(getStableUserId());
  const [currentUserName, setCurrentUserName] = useState('');

  const {
    isConnected,
    connectedUsers,
    lastUpdate,
    notifications,
    joinSession: joinSocketSession,
    leaveSession: leaveSocketSession,
    sendTyping,
    stopTyping,
    clearNotifications,
    removeNotification,
  } = useSocket();

  const { isConnected: walletConnected, address: walletAddress } = useWallet();
  const {
    createSession: createBlockchainSession,
    makePayment: makeBlockchainPayment,
    isLoading: contractLoading,
    error: contractError,
    clearError: clearContractError,
  } = useContract();

  const [blockchainSessionId, setBlockchainSessionId] = useState<string | null>(null);
  const [paymentStates, setPaymentStates] = useState<{ [userId: string]: 'pending' | 'paying' | 'paid' | 'failed' }>(
    {}
  );

  const searchParams = useSearchParams();

  // -------- Carga por URL --------
useEffect(() => {
  const sessionIdFromUrl = searchParams.get('sessionId');
  const userNameFromUrl = searchParams.get('userName');
  const walletAddressFromUrl = searchParams.get('walletAddress');
  
  if (sessionIdFromUrl && !currentSession) {
    loadSessionFromUrl(sessionIdFromUrl);
    if (userNameFromUrl) setCurrentUserName(userNameFromUrl);
    
    if (walletAddressFromUrl && !walletConnected) {
      const shortAddress = `${walletAddressFromUrl.slice(0, 6)}...${walletAddressFromUrl.slice(-4)}`;
      setError(`Conecta tu wallet (${shortAddress}) para poder realizar pagos blockchain`);
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams, currentSession, walletConnected]);

  const loadSessionFromUrl = async (sessionId: string) => {
  setLoading(true);
  try {
    const resp = await fetch(`http://localhost:3000/api/sessions/${sessionId}`);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const data = await resp.json();
    const session = (data.session || data) as Session;
    session.items = (session.items || []).map((it) => ({ ...it, assignees: parseAssigneesSafe(it.assignees) }));
    setCurrentSession(session);
    
    // ← NUEVO: Cargar blockchainSessionId si existe
    if (session.blockchainSessionId) {
      setBlockchainSessionId(session.blockchainSessionId);
    }
    
    if (session.participants?.length > 0) await fetchSplitsForSession(sessionId);
  } catch (e) {
    setError('Error cargando sesión desde el enlace');
  } finally {
    setLoading(false);
  }
};

  const fetchSplitsForSession = async (sessionId: string) => {
    try {
      const resp = await fetch(`http://localhost:3000/api/sessions/${sessionId}/splits`);
      if (resp.ok) {
        const data = await resp.json();
        setSplits(data.splits);
      }
    } catch (e) {
      console.error('Error cargando splits:', e);
    }
  };

  // -------- Health --------
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('http://localhost:3000/health');
        await response.json();
        setApiStatus('connected');
      } catch {
        setApiStatus('disconnected');
        setError('Backend no disponible. Asegúrate de que esté corriendo en puerto 3000');
      }
    })();
  }, []);

  // -------- Real-time updates --------
  useEffect(() => {
    if (!lastUpdate || !currentSession) return;
    if (lastUpdate.session && lastUpdate.session.sessionId === currentSession.sessionId) {
      const updated = {
        ...lastUpdate.session,
        items: (lastUpdate.session.items || []).map((it: any) => ({
          ...it,
          assignees: parseAssigneesSafe(it.assignees),
        })),
      };
      setCurrentSession(updated);
      if (lastUpdate.splits) setSplits(lastUpdate.splits);
    }
  }, [lastUpdate, currentSession?.sessionId]);

  useEffect(() => {
    if (currentSession && isConnected && currentUserName) {
      joinSocketSession(currentSession.sessionId, currentUserId, currentUserName);
    }
    return () => {
      if (currentSession) leaveSocketSession();
    };
  }, [currentSession?.sessionId, isConnected, currentUserName, joinSocketSession, leaveSocketSession, currentUserId]);

  // -------- Sincronizar wallet con backend --------
  const syncWalletToBackend = async () => {
    if (!currentSession || !walletConnected || !walletAddress) return;
    try {
      // 1) Intento directo: PUT
      let res = await fetch(
        `http://localhost:3000/api/sessions/${currentSession.sessionId}/participants/${currentUserId}/wallet`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, name: currentUserName || `User ${currentUserId.slice(-5)}` }),
        }
      );

      // 2) Si no existe el participante, me uno y reintento
      if (res.status === 404) {
        await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUserId,
            name: currentUserName || `User ${currentUserId.slice(-5)}`,
            wallet_address: walletAddress,
          }),
        });

        res = await fetch(
          `http://localhost:3000/api/sessions/${currentSession.sessionId}/participants/${currentUserId}/wallet`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress }),
          }
        );
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Wallet sync failed (${res.status})`);
      }
    } catch (e: any) {
      console.error('[syncWalletToBackend] error', e);
      setError(e?.message || 'No se pudo sincronizar la wallet');
    }
  };

  // Auto-sync cuando haya wallet + sesión
  useEffect(() => {
    if (currentSession && walletConnected && walletAddress) {
      syncWalletToBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.sessionId, walletConnected, walletAddress]);

  // -------- Acciones --------
  const createSession = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('http://localhost:3000/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchantId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    setCurrentSession(data.session);
    const userName = prompt('Ingresa tu nombre para la sesión:') || `Usuario ${currentUserId.slice(-5)}`;
    setCurrentUserName(userName);

    if (walletConnected && walletAddress) {
      const r = await createBlockchainSession(
        data.session.sessionId,
        merchantId,
        walletAddress,
        parseFloat(data.session.totalAmount) || 0
      );
      if (r.success) {
        setBlockchainSessionId(data.session.sessionId);
        
        // Guardar blockchainSessionId en backend
        try {
          await fetch(`http://localhost:3000/api/sessions/${data.session.sessionId}/blockchain`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockchainSessionId: data.session.sessionId }),
          });
          console.log('✅ BlockchainSessionId guardado en backend');
        } catch (err) {
          console.error('❌ Error guardando blockchainSessionId:', err);
          // No bloqueamos la ejecución si falla esto
        }
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error creando sesión');
  } finally {
    setLoading(false);
  }
};
  const joinSession = async () => {
    if (!currentSession) return;
    try {
      const userName = prompt('Ingresa tu nombre:') || `User ${Date.now()}`;
      setCurrentUserName(userName);
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          name: userName,
          wallet_address: walletAddress || null,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      data.session.items = (data.session.items || []).map((it: any) => ({
        ...it,
        assignees: parseAssigneesSafe(it.assignees),
      }));
      setCurrentSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    }
  };

  const addItem = async () => {
    if (!currentSession || !itemName || !itemAmount) return;
    setLoading(true);
    sendTyping?.('adding-item');
    try {
      const assignees =
        selectedParticipants.length > 0 ? selectedParticipants : currentSession.participants.map((p) => p.id);

      const resp = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, amount: itemAmount, tax: 0, tip: 0, assignees }),
      });
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const data = await resp.json();

      const updated = {
        ...data.session,
        items: (data.session.items || []).map((it: any) => ({ ...it, assignees: parseAssigneesSafe(it.assignees) })),
      };
      setCurrentSession(updated);
      if (data.splits) setSplits(data.splits);

      setItemName('');
      setItemAmount('');
      setSelectedParticipants([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error agregando item');
    } finally {
      setLoading(false);
      stopTyping?.();
    }
  };

  const handleIndividualPayment = async (participant: Split) => {
    if (!walletConnected || !walletAddress || !blockchainSessionId) {
      setError('Conecta tu wallet primero');
      return;
    }
    try {
      // 🔒 Asegura existencia del participante y wallet en backend
      await syncWalletToBackend();

      setPaymentStates((prev) => ({ ...prev, [participant.userId]: 'paying' }));
      const result = await makeBlockchainPayment(blockchainSessionId, walletAddress);
      if (result.success) {
        setPaymentStates((prev) => ({ ...prev, [participant.userId]: 'paid' }));
        setError(null);
      } else {
        setPaymentStates((prev) => ({ ...prev, [participant.userId]: 'failed' }));
        setError(result.error || 'Error en el pago');
      }
    } catch (error: any) {
      setPaymentStates((prev) => ({ ...prev, [participant.userId]: 'failed' }));
      setError(error?.message || 'Error realizando pago');
    }
  };

  const toggleParticipantSelection = (participantId: number | string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId]
    );
  };

  const getParticipantNames = (assignees: any) => {
    if (!currentSession) return '';
    const arr = parseAssigneesSafe(assignees);
    const names = arr
      .map((id) => currentSession.participants.find((p) => String(p.id) === String(id))?.name || `User ${id}`)
      .filter(Boolean);
    if (names.length === 0 || names.length === currentSession.participants.length) return 'Todos';
    return names.join(', ');
  };

  const generateQRValue = () => {
    if (!currentSession) return '';
    const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseURL}/session/${currentSession.sessionId}?userId=${currentUserId}&userName=${encodeURIComponent(
      currentUserName
    )}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateQRValue());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  // ========= Render =========
  return (
    <div className="relative min-h-screen">
      {/* Fondo tipo landing */}
      <Plasma color="#6366f1" speed={0.6} direction="forward" scale={1.1} opacity={0.6} mouseInteractive />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-purple-900/20 to-black/40 pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900/80 via-blue-900/60 to-slate-900/80 border-b border-emerald-500/20 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-emerald-400">QRSplit MVP</span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-300">Smart Contract</span>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" />
                <span>Real-time splits</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Blockchain ready</span>
              </div>
              <span>•</span>
              <span>Perfect for demo</span>
            </div>
          </div>
        </div>

        <RealtimeNotifications
          isConnected={isConnected}
          connectedUsers={connectedUsers}
          notifications={notifications}
          onRemoveNotification={removeNotification}
          onClearNotifications={clearNotifications}
        />

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
            <WalletButton size="sm" />
          </div>

          {/* Hero */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <QrCode className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
                <div className="absolute inset-0 bg-emerald-400/20 blur-xl" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
              QRSplit App
            </h1>
            <p className="text-xl text-slate-200 mb-6">Divide cuentas en tiempo real con garantía blockchain</p>

            <div className="flex items-center justify-center flex-wrap gap-2">
              <Badge
                className={`${
                  apiStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                Backend: {apiStatus === 'connected' ? '✅' : '❌'}
              </Badge>
              <Badge
                className={`${
                  isConnected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
              >
                Real-time: {isConnected ? '✅' : '🔄'}
              </Badge>
              <Badge
                className={`${
                  walletConnected ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
              >
                <Wallet className="w-3 h-3 mr-1" />
                Wallet: {walletConnected ? '✅' : '❌'}
              </Badge>
              {blockchainSessionId && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Blockchain: ✅
                </Badge>
              )}
            </div>
          </div>

          {/* Error */}
          {(error || contractError) && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error || contractError}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null);
                  clearContractError();
                }}
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* Main */}
          {!currentSession ? (
            <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center text-white">Crear Nueva Sesión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Nombre del local/evento</label>
                  <Input
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="Ej: Restaurant Pizza Palace"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                {!walletConnected && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Conecta tu wallet para habilitar pagos blockchain
                    </p>
                  </div>
                )}

                <Button
                  onClick={createSession}
                  disabled={loading || !merchantId}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/50"
                >
                  {loading ? 'Creando...' : '🚀 Crear & Generar QR'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR */}
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-emerald-400" />
                      Comparte tu sesión
                      {connectedUsers.length > 0 && (
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{connectedUsers.length} online</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <CopyIcon className="w-4 h-4 mr-1" />
                        {copiedLink ? '¡Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    <div className="bg-white p-4 rounded-lg">
                      <CustomQRCode value={generateQRValue()} size={180} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white mb-2">¡Escanea para unirte!</h3>
                      <p className="text-slate-400 mb-4">Sesión: {currentSession.sessionId.slice(-8)}...</p>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-emerald-400">
                          <Check className="w-4 h-4 mr-2" />
                          {currentSession.participantsCount} participantes
                        </div>
                        {isConnected && (
                          <div className="flex items-center text-sm text-cyan-400">
                            <Wifi className="w-4 h-4 mr-2" />
                            Sincronización activa
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info de sesión */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Users className="w-5 h-5 mr-2 text-emerald-400" />
                    Información de Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Local:</span>
                      <p className="font-medium text-white">{merchantId}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Estado:</span>
                      <Badge className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {currentSession.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-400">Participantes:</span>
                      <p className="font-medium text-white">{currentSession.participantsCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total:</span>
                      <p className="font-medium text-emerald-400">
                        {formatCurrency(parseFloat(currentSession.totalAmount))}
                      </p>
                    </div>
                  </div>

                  {currentSession.participants.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <h4 className="font-medium mb-2 text-white">Participantes:</h4>
                      <div className="space-y-2">
                        {currentSession.participants.map((participant, index) => {
                          const isOnline = connectedUsers.some((u: any) => u.userId === participant.userId);
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm bg-slate-700/30 px-3 py-2 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-white">{participant.name || participant.userId}</span>
                                {participant.userId === currentUserId && (
                                  <Badge variant="outline" className="ml-2 text-xs border-emerald-500/20 text-emerald-400">
                                    Tú
                                  </Badge>
                                )}
                                {participant.walletAddress && <Wallet className="w-3 h-3 ml-2 text-purple-400" />}
                              </div>
                              {isOnline && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                                  Online
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-700">
                    <Button
                      onClick={joinSession}
                      className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Unirse a Sesión
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Agregar Item */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Plus className="w-5 h-5 mr-2 text-emerald-400" />
                    Agregar Item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Nombre del Item</label>
                    <Input
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Ej: Hamburguesa, Bebida..."
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Precio</label>
                    <Input
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                      placeholder="$2000"
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {currentSession.participants.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">¿Quiénes consumieron?</label>
                      <div className="space-y-2">
                        {currentSession.participants.map((participant: Participant) => (
                          <Button
                            key={participant.id}
                            type="button"
                            variant={selectedParticipants.includes(participant.id) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleParticipantSelection(participant.id)}
                            className={`w-full justify-start ${
                              selectedParticipants.includes(participant.id)
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                                : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {selectedParticipants.includes(participant.id) ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : (
                              <User className="w-4 h-4 mr-2" />
                            )}
                            {participant.name || participant.userId}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedParticipants.length === 0
                          ? 'Si no seleccionas a nadie, se asignará a todos'
                          : `Seleccionados: ${selectedParticipants.length} de ${currentSession.participants.length}`}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={addItem}
                    disabled={loading || !itemName || !itemAmount}
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {loading ? 'Agregando...' : 'Agregar Item'}
                  </Button>
                </CardContent>
              </Card>

              {/* Items */}
              {currentSession.items.length > 0 && (
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <DollarSign className="w-5 h-5 mr-2 text-emerald-400" />
                      Items en la Cuenta ({currentSession.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentSession.items.map((item: Item, index: number) => (
                        <div key={index} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{item.name}</h4>
                              <p className="text-sm text-slate-400">Asignado a: {getParticipantNames(item.assignees || [])}</p>
                            </div>
                            <span className="font-mono text-emerald-400 text-lg">{formatCurrency(Number(item.amount))}</span>
                          </div>
                        </div>
                      ))}

                      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Total:</span>
                          <span className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(parseFloat(currentSession.totalAmount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Splits + Pago */}
              {currentSession.participants.length > 0 && splits && (
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-emerald-400" />
                        División de Pagos
                        {isConnected && (
                          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                            <Wifi className="w-3 h-3 mr-1" />
                            Sincronizado
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {splits.participants.map((participant: Split, index: number) => {
                        const isCurrentUser = participant.userId === currentUserId;
                        const isOnline = connectedUsers.some((u: any) => u.userId === participant.userId);
                        const paymentState = paymentStates[participant.userId] || 'pending';

                        return (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              isCurrentUser ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-700/30 border-slate-600'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                  <h4 className="font-medium text-white flex items-center gap-2">
                                    {participant.name}
                                    {isCurrentUser && (
                                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Tú</Badge>
                                    )}
                                  </h4>
                                  <p className="text-sm text-slate-500">{participant.userId}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${isCurrentUser ? 'text-purple-400' : 'text-emerald-400'}`}>
                                  {formatCurrency(participant.amount)}
                                </p>
                                <p className="text-sm text-slate-500">{participant.percentage.toFixed(1)}% del total</p>
                              </div>
                            </div>

                            {isCurrentUser && walletConnected && blockchainSessionId && (
                              <div className="mt-3 pt-3 border-t border-slate-600">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {paymentState === 'paid' ? (
                                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Pagado
                                      </Badge>
                                    ) : paymentState === 'paying' ? (
                                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                                        Procesando...
                                      </Badge>
                                    ) : paymentState === 'failed' ? (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Error
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pendiente
                                      </Badge>
                                    )}
                                  </div>

                                  {paymentState !== 'paid' && (
                                    <Button
                                      onClick={() => handleIndividualPayment(participant)}
                                      disabled={contractLoading}
                                      size="sm"
                                      className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 shadow-lg shadow-purple-500/50"
                                    >
                                      <Wallet className="w-4 h-4 mr-1" />
                                      {paymentState === 'failed' ? 'Reintentar' : 'Pagar con Blockchain'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {isCurrentUser && !walletConnected && (
                              <div className="mt-3 pt-3 border-t border-slate-600">
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded">
                                  <p className="text-sm text-yellow-400 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Conecta tu wallet para pagar con blockchain
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-slate-800">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-4">QRSplit v3.0 - Blockchain MVP para Starknet Hackathon</p>
              <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  QR Sharing
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-cyan-400" />
                  Real-time Splits
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-purple-400" />
                  Smart Contracts
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Mobile Ready
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
