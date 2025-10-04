'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { QrCode, Users, Plus, DollarSign, Calculator, TrendingUp, User, Check, X, Edit, Share2, Copy, Wifi, WifiOff, Bell, Wallet, Link as LinkIcon, CheckCircle, Clock, AlertCircle, ArrowLeft, Home, Shield, Zap } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { WalletButton } from '../../components/WalletButton';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import { useSearchParams } from 'next/navigation';

// Componente de notificaciones real-time con diseño actualizado
const RealtimeNotifications = ({ isConnected, connectedUsers, notifications, onRemoveNotification, onClearNotifications }: any) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setShowNotifications(true);
    }
  }, [notifications.length]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <div className="flex items-center justify-end space-x-2">
        <Badge className={`${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
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
              <div key={index} className="flex items-start justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm">
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

// Componente QR personalizado
const CustomQRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current && value) {
        try {
          const QRCode = (await import('qrcode')).default;
          await QRCode.toCanvas(canvasRef.current, value, {
            width: size,
            margin: 1,
            color: {
              dark: '#00D9A0',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }
    };
    generateQR();
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-xl" style={{ maxWidth: '100%', height: 'auto' }} />;
};

interface Participant {
  id: number;
  userId: string;
  name?: string;
  walletAddress?: string;
  addedBy?: string;
  isOperator?: boolean;
}

interface Item {
  id: number;
  name: string;
  amount: number;
  tax?: number;
  tip?: number;
  assignees?: number[];
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
}

interface Split {
  participantId: number;
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

export default function QRSplitApp() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('checking...');
  const [merchantId, setMerchantId] = useState('demo_merchant');
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [splits, setSplits] = useState<SplitData | null>(null);
  const [splitMethod, setSplitMethod] = useState('proportional');
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentUserId] = useState(`user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
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
    removeNotification
  } = useSocket();

  const { isConnected: walletConnected, address: walletAddress, formatAddress } = useWallet();
  const {
    createSession: createBlockchainSession,
    joinSession: joinBlockchainSession,
    makePayment: makeBlockchainPayment,
    executeGroupPayment,
    getSession: getBlockchainSession,
    getPaymentStatus,
    isLoading: contractLoading,
    error: contractError,
    clearError: clearContractError
  } = useContract();

  const [blockchainSessionId, setBlockchainSessionId] = useState<string | null>(null);
  const [paymentStates, setPaymentStates] = useState<{ [userId: string]: 'pending' | 'paying' | 'paid' | 'failed' }>({});
  const [showGroupPayButton, setShowGroupPayButton] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('sessionId');
    const userNameFromUrl = searchParams.get('userName');
    
    if (sessionIdFromUrl && !currentSession) {
      loadSessionFromUrl(sessionIdFromUrl);
      if (userNameFromUrl) {
        setCurrentUserName(userNameFromUrl);
      }
    }
  }, [searchParams, currentSession]);

  const loadSessionFromUrl = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const session = data.session || data;
      setCurrentSession(session);
      if (session.participants?.length > 0) {
        await fetchSplitsForSession(sessionId);
      }
    } catch (error) {
      setError('Error cargando sesión desde el enlace');
    } finally {
      setLoading(false);
    }
  };

  const fetchSplitsForSession = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/splits`);
      if (response.ok) {
        const data = await response.json();
        setSplits(data.splits);
      }
    } catch (error) {
      console.error('Error cargando splits:', error);
    }
  };

  useEffect(() => {
    checkAPIStatus();
  }, []);

  useEffect(() => {
    if (currentSession && currentSession.participants.length > 0) {
      fetchSplits();
    }
  }, [currentSession?.totalAmount, currentSession?.participants.length]);

  useEffect(() => {
    if (!lastUpdate || !currentSession) return;
    if (lastUpdate.session && lastUpdate.session.sessionId === currentSession.sessionId) {
      setCurrentSession(lastUpdate.session);
      if (lastUpdate.splits) {
        setSplits(lastUpdate.splits);
      }
    }
  }, [lastUpdate, currentSession?.sessionId]);

  useEffect(() => {
    if (currentSession && isConnected && currentUserName) {
      joinSocketSession(currentSession.sessionId, currentUserId, currentUserName);
    }
    return () => {
      if (currentSession) {
        leaveSocketSession();
      }
    };
  }, [currentSession?.sessionId, isConnected, currentUserName, joinSocketSession, leaveSocketSession, currentUserId]);

  const checkAPIStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/health');
      await response.json();
      setApiStatus('connected');
    } catch (err) {
      setApiStatus('disconnected');
      setError('Backend no disponible. Asegúrate de que esté corriendo en puerto 3000');
    }
  };

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
      setShowQRCode(true);
      const userName = prompt('Ingresa tu nombre para la sesión:') || `Usuario ${currentUserId.slice(-5)}`;
      setCurrentUserName(userName);

      if (walletConnected && walletAddress) {
        const blockchainResult = await createBlockchainSession(
          data.session.sessionId,
          merchantId,
          walletAddress,
          parseFloat(data.session.totalAmount) || 0
        );
        if (blockchainResult.success) {
          setBlockchainSessionId(data.session.sessionId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando sesión');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!currentSession || !itemName || !itemAmount) return;
    setLoading(true);
    if (sendTyping) sendTyping('adding-item');
    try {
      const assignees = selectedParticipants.length > 0 
        ? selectedParticipants 
        : currentSession.participants.map(p => p.id);

      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, amount: itemAmount, tax: 0, tip: 0, assignees }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!lastUpdate || lastUpdate.type !== 'item-added') {
        setCurrentSession(data.session);
        if (data.splits) setSplits(data.splits);
      }
      setItemName('');
      setItemAmount('');
      setSelectedParticipants([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error agregando item');
    } finally {
      setLoading(false);
      if (stopTyping) stopTyping();
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
        body: JSON.stringify({ user_id: currentUserId, name: userName, wallet_address: walletAddress || null }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCurrentSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    }
  };

  const fetchSplits = async () => {
    if (!currentSession) return;
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/splits`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSplits(data.splits);
    } catch (err) {
      console.error('Error fetching splits:', err);
    }
  };

  const handleIndividualPayment = async (participant: Split) => {
    if (!walletConnected || !walletAddress || !blockchainSessionId) {
      setError('Conecta tu wallet primero');
      return;
    }
    try {
      setPaymentStates(prev => ({ ...prev, [participant.userId]: 'paying' }));
      const result = await makeBlockchainPayment(blockchainSessionId, walletAddress);
      if (result.success) {
        setPaymentStates(prev => ({ ...prev, [participant.userId]: 'paid' }));
      } else {
        setPaymentStates(prev => ({ ...prev, [participant.userId]: 'failed' }));
        setError(result.error || 'Error en el pago');
      }
    } catch (error) {
      setPaymentStates(prev => ({ ...prev, [participant.userId]: 'failed' }));
      setError(error instanceof Error ? error.message : 'Error realizando pago');
    }
  };

  const toggleParticipantSelection = (participantId: number) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) ? prev.filter(id => id !== participantId) : [...prev, participantId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(amount);
  };

  const getParticipantNames = (assignees: number[] | any) => {
    if (!currentSession) return '';
    let assigneesArray: number[] = [];
    if (Array.isArray(assignees)) {
      assigneesArray = assignees;
    } else if (assignees && typeof assignees === 'string') {
      try {
        const parsed = JSON.parse(assignees);
        if (Array.isArray(parsed)) assigneesArray = parsed;
      } catch (e) {
        assigneesArray = [];
      }
    }
    const names = assigneesArray
      .filter(id => typeof id === 'number')
      .map(id => currentSession.participants.find(p => p.id === id)?.name || `User ${id}`)
      .filter(Boolean);
    if (names.length === 0 || names.length === currentSession.participants.length) return 'Todos';
    return names.join(', ');
  };

  const generateQRValue = () => {
    if (!currentSession) return '';
    const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseURL}/session/${currentSession.sessionId}?userId=${currentUserId}&userName=${encodeURIComponent(currentUserName)}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Banner de simulación */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-b border-emerald-500/20 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-emerald-400">QRSplit MVP</span>
            <span className="text-slate-400">•</span>
            <span className="text-sm text-slate-300">Smart Contract</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
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
        {/* Header con navegación */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <WalletButton size="sm" />
        </div>

        {/* Header Principal */}
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
          <p className="text-xl text-slate-300 mb-6">Divide cuentas en tiempo real con garantía blockchain</p>
          
          {/* Status badges */}
          <div className="flex items-center justify-center flex-wrap gap-2">
            <Badge className={`${apiStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              Backend: {apiStatus === 'connected' ? '✅' : '❌'}
            </Badge>
            <Badge className={`${isConnected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
              Real-time: {isConnected ? '✅' : '🔄'}
            </Badge>
            <Badge className={`${walletConnected ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
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

        {/* Error Display */}
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
              onClick={() => { setError(null); clearContractError(); }}
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Main Content */}
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
            {/* QR Code Card */}
            <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    Comparte tu sesión
                    {connectedUsers.length > 0 && (
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                        {connectedUsers.length} online
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard} size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Copy className="w-4 h-4 mr-1" />
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

            {/* Session Info */}
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
                    <Badge className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{currentSession.status}</Badge>
                  </div>
                  <div>
                    <span className="text-slate-400">Participantes:</span>
                    <p className="font-medium text-white">{currentSession.participantsCount}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total:</span>
                    <p className="font-medium text-emerald-400">{formatCurrency(parseFloat(currentSession.totalAmount))}</p>
                  </div>
                </div>

                {currentSession.participants.length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <h4 className="font-medium mb-2 text-white">Participantes:</h4>
                    <div className="space-y-2">
                      {currentSession.participants.map((participant, index) => {
                        const isOnline = connectedUsers.some((u: any) => u.userId === participant.userId);
                        return (
                          <div key={index} className="flex items-center justify-between text-sm bg-slate-700/30 px-3 py-2 rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-white">{participant.name || participant.userId}</span>
                              {participant.userId === currentUserId && (
                                <Badge variant="outline" className="ml-2 text-xs border-emerald-500/20 text-emerald-400">Tú</Badge>
                              )}
                              {participant.walletAddress && (
                                <Wallet className="w-3 h-3 ml-2 text-purple-400" />
                              )}
                            </div>
                            {isOnline && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">Online</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-700">
                  <Button onClick={joinSession} className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
                    <Users className="w-4 h-4 mr-2" />
                    Unirse a Sesión
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Add Items */}
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
                    <label className="block text-sm font-medium mb-2 text-slate-300">
                      ¿Quiénes consumieron este item?
                    </label>
                    <div className="space-y-2">
                      {currentSession.participants.map((participant: Participant) => (
                        <Button
                          key={participant.id}
                          type="button"
                          variant={selectedParticipants.includes(participant.id) ? "default" : "outline"}
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
                        ? "Si no seleccionas a nadie, se asignará a todos" 
                        : `Seleccionados: ${selectedParticipants.length} de ${currentSession.participants.length}`
                      }
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

            {/* Items List */}
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
                            <p className="text-sm text-slate-400">
                              Asignado a: {getParticipantNames(item.assignees || [])}
                            </p>
                          </div>
                          <span className="font-mono text-emerald-400 text-lg">
                            {formatCurrency(item.amount)}
                          </span>
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

            {/* Split Calculator con Blockchain Payments */}
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
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Método:</span>
                          <p className="font-medium text-white capitalize">{splits.method}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Participantes:</span>
                          <p className="font-medium text-white">{splits.summary.participantCount}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Promedio:</span>
                          <p className="font-medium text-emerald-400">{formatCurrency(splits.summary.averageAmount)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Total:</span>
                          <p className="font-medium text-emerald-400">{formatCurrency(splits.calculatedTotal)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Splits */}
                    <div className="space-y-3">
                      {splits.participants.map((participant: Split, index: number) => {
                        const isCurrentUser = participant.userId === currentUserId;
                        const isOnline = connectedUsers.some((u: any) => u.userId === participant.userId);
                        const paymentState = paymentStates[participant.userId] || 'pending';
                        
                        return (
                          <div 
                            key={index} 
                            className={`border rounded-lg p-4 ${
                              isCurrentUser 
                                ? 'bg-purple-500/10 border-purple-500/30' 
                                : 'bg-slate-700/30 border-slate-600'
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
                                <p className="text-sm text-slate-500">
                                  {participant.percentage.toFixed(1)}% del total
                                </p>
                              </div>
                            </div>

                            {/* Botón de pago blockchain */}
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

                                  {paymentState === 'pending' && (
                                    <Button
                                      onClick={() => handleIndividualPayment(participant)}
                                      disabled={contractLoading}
                                      size="sm"
                                      className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 shadow-lg shadow-purple-500/50"
                                    >
                                      <Wallet className="w-4 h-4 mr-1" />
                                      Pagar con Blockchain
                                    </Button>
                                  )}

                                  {paymentState === 'failed' && (
                                    <Button
                                      onClick={() => handleIndividualPayment(participant)}
                                      disabled={contractLoading}
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    >
                                      <Wallet className="w-4 h-4 mr-1" />
                                      Reintentar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Warning sin wallet */}
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
            <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-slate-500">
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
  );
}