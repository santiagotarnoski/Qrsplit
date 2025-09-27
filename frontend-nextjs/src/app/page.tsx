'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { Badge } from '@app/components/ui/badge';
import { QrCode, Users, Plus, DollarSign, Calculator, TrendingUp, User, Check, X, Edit, Share2, Copy, Wifi, WifiOff, Bell, Wallet, Link, CheckCircle, Clock, AlertCircle } from 'lucide-react';
// Hook de Socket.io (importar desde tu archivo)
import { useSocket } from '../hooks/useSocket';
// NUEVO: Imports de wallet y blockchain
import { WalletButton } from '../components/WalletButton';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useSearchParams } from 'next/navigation';

// Componente de notificaciones real-time simple
const RealtimeNotifications = ({ isConnected, connectedUsers, notifications, onRemoveNotification, onClearNotifications }: any) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setShowNotifications(true);
    }
  }, [notifications.length]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Status Indicator */}
      <div className="flex items-center justify-end space-x-2">
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Real-time ON</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Conectando...</span>
            </>
          )}
        </div>

        {/* Connected Users Counter */}
        {isConnected && connectedUsers.length > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Users className="w-3 h-3" />
            <span>{connectedUsers.length} conectados</span>
          </div>
        )}

        {/* Notifications Toggle */}
        {notifications.length > 0 && (
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Notifications Panel */}
      {showNotifications && notifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Actualizaciones
            </h3>
            <div className="flex space-x-1">
              <button
                onClick={onClearNotifications}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((notification: string, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-2 bg-blue-50 rounded text-sm"
              >
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{notification}</span>
                </div>
                <button
                  onClick={() => onRemoveNotification(index)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Users Panel */}
      {isConnected && connectedUsers.length > 0 && showNotifications && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-medium text-gray-900 flex items-center mb-3">
            <Users className="w-4 h-4 mr-2" />
            Usuarios conectados ({connectedUsers.length})
          </h3>
          <div className="space-y-2">
            {connectedUsers.map((user: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{user.userName}</span>
                </div>
                <span className="text-gray-500 text-xs">
                  {user.connectedAt ? new Date(user.connectedAt).toLocaleTimeString() : 'Ahora'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente QR personalizado que funciona sin errores
const CustomQRCode: React.FC<{ value: string; size?: number }> = ({ 
  value, 
  size = 180 
}) => {
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
              dark: '#1e40af',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
        } catch (err) {
          console.error('Error generating QR code:', err);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = size;
              canvasRef.current.height = size;
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(0, 0, size, size);
              ctx.fillStyle = '#6b7280';
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('QR Code', size/2, size/2);
            }
          }
        }
      }
    };

    generateQR();
  }, [value, size]);

  return (
    <canvas 
      ref={canvasRef} 
      className="rounded-lg"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

interface Participant {
  id: number;
  userId: string;
  name?: string;
  walletAddress?: string;
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

  // Socket.io integration
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

  // NUEVO: Blockchain integration
  const { isConnected: walletConnected, address: walletAddress, formatAddress } = useWallet();
  console.log('🔍 [WALLET DEBUG]', { walletConnected, walletAddress, formatAddress });
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

  // NUEVO: Estados para blockchain
  const [blockchainSessionId, setBlockchainSessionId] = useState<string | null>(null);
  const [paymentStates, setPaymentStates] = useState<{ [userId: string]: 'pending' | 'paying' | 'paid' | 'failed' }>({});
  const [showGroupPayButton, setShowGroupPayButton] = useState(false);

  // Auto-cargar sesión desde URL parameters
const searchParams = useSearchParams();

useEffect(() => {
  const sessionIdFromUrl = searchParams.get('sessionId');
  const userNameFromUrl = searchParams.get('userName');
  const userIdFromUrl = searchParams.get('userId');
  const justJoined = searchParams.get('joined');
  
  console.log('🔍 [URL CHECK]', { sessionIdFromUrl, userNameFromUrl, justJoined, hasCurrentSession: !!currentSession });
  
  if (sessionIdFromUrl && !currentSession) {
    console.log('📍 [URL] Cargando sesión desde URL:', sessionIdFromUrl);
    loadSessionFromUrl(sessionIdFromUrl);
    
    if (userNameFromUrl && userIdFromUrl) {
      setCurrentUserName(userNameFromUrl);
    }
  }
}, [searchParams, currentSession]);

const loadSessionFromUrl = async (sessionId: string) => {
  setLoading(true);
  setError(null);
  
  try {
    console.log('🔄 [LOAD] Cargando sesión desde URL:', sessionId);
    
    const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ [LOAD] Respuesta del backend:', data);
    
    // Manejar diferentes formatos de respuesta del backend
    const session = data.session || data;
    setCurrentSession(session);
    
    // Cargar splits si hay participantes
    if (session.participants?.length > 0) {
      console.log('📊 [SPLITS] Cargando splits...');
      await fetchSplitsForSession(sessionId);
    }
    
  } catch (error) {
    console.error('❌ [LOAD] Error cargando sesión desde URL:', error);
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
      console.log('✅ [SPLITS] Splits cargados:', data);
      setSplits(data.splits);
    }
  } catch (error) {
    console.error('❌ [SPLITS] Error cargando splits:', error);
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

  // Real-time socket updates handler
  useEffect(() => {
    if (!lastUpdate || !currentSession) return;

    console.log('🔄 [REALTIME] Actualizando desde socket:', lastUpdate);

    if (lastUpdate.session && lastUpdate.session.sessionId === currentSession.sessionId) {
      setCurrentSession(lastUpdate.session);
      
      if (lastUpdate.splits) {
        setSplits(lastUpdate.splits);
      }
    }
  }, [lastUpdate, currentSession?.sessionId]);

  // Auto-join socket session cuando se crea o carga una sesión
  useEffect(() => {
    if (currentSession && isConnected && currentUserName) {
      console.log(`🔌 [SOCKET] Auto-joining session: ${currentSession.sessionId}`);
      joinSocketSession(currentSession.sessionId, currentUserId, currentUserName);
    }

    return () => {
      if (currentSession) {
        leaveSocketSession();
      }
    };
  }, [currentSession?.sessionId, isConnected, currentUserName, joinSocketSession, leaveSocketSession, currentUserId]);

  // NUEVO: Verificar estado de pagos blockchain
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (blockchainSessionId && splits) {
        try {
          const status = await getPaymentStatus(blockchainSessionId);
          
          // Verificar si todos han pagado
          if (status.is_fully_paid && status.total_participants > 0) {
            setShowGroupPayButton(true);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
    };

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [blockchainSessionId, splits, getPaymentStatus]);

  const checkAPIStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      setApiStatus('connected ✅');
      console.log('Backend status:', data);
    } catch (err) {
      setApiStatus('disconnected ❌');
      setError('Backend no disponible. Asegúrate de que esté corriendo en puerto 3000');
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchant_id: merchantId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentSession(data.session);
      setShowQRCode(true);
      
      // Prompt for user name and join socket session
      const userName = prompt('Ingresa tu nombre para la sesión:') || `Usuario ${currentUserId.slice(-5)}`;
      setCurrentUserName(userName);

      // NUEVO: Crear sesión en blockchain si wallet está conectada
      if (walletConnected && walletAddress) {
        console.log('🔗 [BLOCKCHAIN] Creando sesión en smart contract...');
        const blockchainResult = await createBlockchainSession(
          data.session.sessionId,
          merchantId,
          walletAddress,
          parseFloat(data.session.totalAmount) || 0
        );
        
        if (blockchainResult.success) {
          setBlockchainSessionId(data.session.sessionId);
          console.log('✅ [BLOCKCHAIN] Sesión creada:', blockchainResult.txHash);
        } else {
          console.error('❌ [BLOCKCHAIN] Error creando sesión:', blockchainResult.error);
        }
      }
      
      console.log('Session created:', data);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: itemName,
          amount: itemAmount,
          tax: 0,
          tip: 0,
          assignees: assignees
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Solo actualizar si no viene del socket (evitar duplicados)
      if (!lastUpdate || lastUpdate.type !== 'item-added') {
        setCurrentSession(data.session);
        if (data.splits) {
          setSplits(data.splits);
        }
      }
      
      // Limpiar formulario
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

  const updateItemAssignees = async (itemId: number, newAssignees: number[]) => {
    if (!currentSession) return;
    
    // Guardar estado original ANTES de hacer cambios optimistas (fuera del try)
    const originalSession = { ...currentSession };
    const previousAssignees = currentSession.items.find(item => item.id === itemId)?.assignees || [];
    
    try {
      
      // Mostrar cambio optimistamente
      const updatedItems = currentSession.items.map(item => 
        item.id === itemId ? { ...item, assignees: newAssignees } : item
      );
      
      setCurrentSession({
        ...currentSession,
        items: updatedItems
      });

      console.log(`🔄 [UPDATE ASSIGNEES] Enviando request para item ${itemId}`);
      console.log(`👥 [ASSIGNEES] Previous: [${previousAssignees}] → New: [${newAssignees}]`);

      // Enviar al backend
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/items/${itemId}/assignees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignees: newAssignees,
          previousAssignees: previousAssignees
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [UPDATE ASSIGNEES] Error response:', response.status, errorData);
        throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ [UPDATE ASSIGNEES] Success:', data);
      
      // Actualizar con respuesta del servidor (si no viene del socket)
      if (!lastUpdate || lastUpdate.type !== 'item-assignees-updated') {
        setCurrentSession(data.session);
        if (data.splits) {
          setSplits(data.splits);
        }
      }
      
      setEditingItem(null);
      
    } catch (err) {
      console.error('🔥 [UPDATE ASSIGNEES] Error:', err);
      setError(err instanceof Error ? err.message : 'Error actualizando asignaciones');
      
      // Revertir al estado original (antes de los cambios optimistas)
      setCurrentSession(originalSession);
    }
  };

  const joinSession = async () => {
    if (!currentSession) return;
    
    try {
      const userName = prompt('Ingresa tu nombre:') || `User ${Date.now()}`;
      setCurrentUserName(userName);
      
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUserId,
          name: userName,
          wallet_address: walletAddress || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentSession(data.session);

      // NUEVO: Unirse a la sesión blockchain si wallet está conectada
      if (walletConnected && walletAddress && blockchainSessionId) {
        // Buscar el monto que debe pagar este usuario
        const userSplit = splits?.participants.find(p => p.userId === currentUserId);
        if (userSplit) {
          console.log('🔗 [BLOCKCHAIN] Uniéndose a sesión blockchain...');
          const blockchainResult = await joinBlockchainSession(
            blockchainSessionId,
            walletAddress,
            Math.round(userSplit.amount * 100) // Convertir a centavos
          );
          
          if (blockchainResult.success) {
            console.log('✅ [BLOCKCHAIN] Unido a sesión:', blockchainResult.txHash);
          } else {
            console.error('❌ [BLOCKCHAIN] Error uniéndose:', blockchainResult.error);
          }
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    }
  };

  const fetchSplits = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/splits`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSplits(data.splits);
    } catch (err) {
      console.error('Error fetching splits:', err);
    }
  };

  const calculateSplits = async (method: string) => {
    if (!currentSession) return;
    
    setLoading(true);
    if (sendTyping) sendTyping('calculating-splits');
    
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${currentSession.sessionId}/calculate-splits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: method,
          options: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSplits(data.splits);
      setSplitMethod(method);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculando splits');
    } finally {
      setLoading(false);
      if (stopTyping) stopTyping();
    }
  };

  // NUEVO: Función para pagar individual
  const handleIndividualPayment = async (participant: Split) => {
    if (!walletConnected || !walletAddress || !blockchainSessionId) {
      setError('Conecta tu wallet primero');
      return;
    }

    if (participant.userId !== currentUserId) {
      setError('Solo puedes pagar tu propia parte');
      return;
    }

    try {
      setPaymentStates(prev => ({ ...prev, [participant.userId]: 'paying' }));
      
      console.log('💰 [PAYMENT] Realizando pago individual...', {
        sessionId: blockchainSessionId,
        participant: participant.userId,
        amount: participant.amount
      });

      const result = await makeBlockchainPayment(blockchainSessionId, walletAddress);
      
      if (result.success) {
        setPaymentStates(prev => ({ ...prev, [participant.userId]: 'paid' }));
        console.log('✅ [PAYMENT] Pago exitoso:', result.txHash);
        
        // Mostrar notificación de éxito
        if (notifications) {
          notifications.push(`💰 Pago realizado exitosamente: ${formatCurrency(participant.amount)}`);
        }
      } else {
        setPaymentStates(prev => ({ ...prev, [participant.userId]: 'failed' }));
        setError(result.error || 'Error en el pago');
      }
    } catch (error) {
      setPaymentStates(prev => ({ ...prev, [participant.userId]: 'failed' }));
      setError(error instanceof Error ? error.message : 'Error realizando pago');
    }
  };

  // NUEVO: Función para ejecutar pago grupal
  const handleGroupPayment = async () => {
    if (!walletConnected || !walletAddress || !blockchainSessionId) {
      setError('Conecta tu wallet primero');
      return;
    }

    try {
      console.log('⚡ [GROUP PAYMENT] Ejecutando pago grupal...');
      
      const result = await executeGroupPayment(blockchainSessionId);
      
      if (result.success) {
        console.log('✅ [GROUP PAYMENT] Pago grupal exitoso:', result.txHash);
        setShowGroupPayButton(false);
        
        // Mostrar notificación de éxito
        if (notifications) {
          notifications.push(`🎉 Pago grupal completado! Tx: ${result.txHash?.slice(0, 10)}...`);
        }
      } else {
        setError(result.error || 'Error en el pago grupal');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error ejecutando pago grupal');
    }
  };

  const toggleParticipantSelection = (participantId: number) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const getParticipantNames = (assignees: number[]) => {
    if (!currentSession) return '';
    
    const names = assignees
      .map(id => currentSession.participants.find(p => p.id === id)?.name || `User ${id}`)
      .filter(Boolean);
    
    if (names.length === 0 || names.length === currentSession.participants.length) {
      return 'Todos';
    }
    
    return names.join(', ');
  };

    const generateQRValue = () => {
      if (!currentSession) return '';
  
      const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
      return `${baseURL}/session/${currentSession.sessionId}`;
    };

  const copyToClipboard = async () => {
    try {
      const qrValue = generateQRValue();
      await navigator.clipboard.writeText(qrValue);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const shareSession = async () => {
    const qrValue = generateQRValue();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QRSplit - Únete a mi sesión de pago',
          text: `Únete para dividir la cuenta: ${currentSession?.sessionId.slice(-8)}...`,
          url: qrValue,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const handleInputFocus = (action: string) => {
    if (sendTyping) sendTyping(action);
  };

  const handleInputBlur = () => {
    if (stopTyping) stopTyping();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      {/* Real-time Notifications Component */}
      <RealtimeNotifications
        isConnected={isConnected}
        connectedUsers={connectedUsers}
        notifications={notifications}
        onRemoveNotification={removeNotification}
        onClearNotifications={clearNotifications}
      />

      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">QRSplit</h1>
            {isConnected && (
              <Badge className="ml-3 bg-green-600">
                <Wifi className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            )}
            {/* NUEVO: Wallet Button en header */}
            <div className="ml-4">
              <WalletButton size="sm" variant="outline" />
            </div>
          </div>
            
          <p className="text-xl text-gray-600 mb-4">
            Escanea, divide, paga - Instantáneo y justo
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <Badge variant="outline">Backend API: {apiStatus}</Badge>
            <Badge variant="outline">Split Engine: ✅</Badge>
            <Badge variant="outline">QR Sharing: ✅</Badge>
            <Badge variant={isConnected ? "default" : "secondary"}>
              Real-time: {isConnected ? '✅' : '🔄'}
            </Badge>
            {/* NUEVO: Indicador de wallet */}
            <Badge variant={walletConnected ? "default" : "secondary"}>
              <Wallet className="w-3 h-3 mr-1" />
              Wallet: {walletConnected ? '✅' : '❌'}
            </Badge>
            {blockchainSessionId && (
              <Badge variant="outline">
                <Link className="w-3 h-3 mr-1" />
                Blockchain: ✅
              </Badge>
            )}
          </div>
        </div>

        {/* Error Display */}
        {(error || contractError) && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800 text-sm">{error || contractError}</p>
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
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {!currentSession ? (
          /* Session Creation */
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Crear Nueva Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del local/evento</label>
                <Input
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  onFocus={() => handleInputFocus('typing-merchant')}
                  onBlur={handleInputBlur}
                  placeholder="Ej: Restaurant Pizza Palace"
                  className="w-full"
                />
              </div>
              
              {/* NUEVO: Indicador de wallet en creación */}
              {!walletConnected && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Conecta tu wallet para habilitar pagos blockchain
                  </p>
                </div>
              )}
              
              <Button 
                onClick={createSession} 
                disabled={loading || !merchantId}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Creando...' : '🚀 Crear & Generar QR'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Active Session */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* QR Code Card - Prominente al inicio */}
            <Card className="lg:col-span-2 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    Comparte tu sesión
                    {connectedUsers.length > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {connectedUsers.length} conectados
                      </Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={shareSession} size="sm" variant="outline">
                      <Share2 className="w-4 h-4 mr-1" />
                      Compartir
                    </Button>
                    <Button onClick={copyToClipboard} size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-1" />
                      {copiedLink ? 'Copiado!' : 'Copiar link'}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
                  <div className="bg-white p-4 rounded-lg border">
                    <CustomQRCode
                      value={generateQRValue()}
                      size={180}
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="font-semibold text-lg mb-2">¡Otros pueden unirse escaneando!</h3>
                    <p className="text-gray-600 mb-2">Sesión: {currentSession.sessionId.slice(-8)}...</p>
                    <p className="text-sm text-gray-500 mb-4">
                      También pueden usar el link: {generateQRValue()}
                    </p>
                    <div className="flex items-center text-sm text-green-600">
                      <Check className="w-4 h-4 mr-1" />
                      Sesión activa - {currentSession.participantsCount} participantes
                    </div>
                    {isConnected && (
                      <div className="flex items-center text-sm text-blue-600 mt-1">
                        <Wifi className="w-4 h-4 mr-1" />
                        Sincronización real-time activa
                      </div>
                    )}
                    {/* NUEVO: Indicador blockchain en QR */}
                    {blockchainSessionId && (
                      <div className="flex items-center text-sm text-purple-600 mt-1">
                        <Link className="w-4 h-4 mr-1" />
                        Smart contract activo
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Sesión Activa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Local:</strong> {merchantId}
                  </div>
                  <div>
                    <strong>Estado:</strong> 
                    <Badge className="ml-2">{currentSession.status}</Badge>
                  </div>
                  <div>
                    <strong>Participantes:</strong> {currentSession.participantsCount}
                  </div>
                  <div>
                    <strong>Total:</strong> {formatCurrency(parseFloat(currentSession.totalAmount))}
                  </div>
                </div>

                {/* Participants List with real-time indicators */}
                {currentSession.participants.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Participantes:</h4>
                    <div className="space-y-2">
                      {currentSession.participants.map((participant: Participant, index: number) => {
                        const isConnected = connectedUsers.some((u: any) => u.userId === participant.userId);
                        return (
                          <div key={index} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <User className="w-4 h-4 mr-2 text-gray-500" />
                              <span>{participant.name || participant.userId}</span>
                              {participant.userId === currentUserId && (
                                <Badge variant="outline" className="ml-2 text-xs">Tú</Badge>
                              )}
                              {/* NUEVO: Indicador de wallet */}
                              {participant.walletAddress && (
                                <Wallet className="w-3 h-3 ml-2 text-purple-600" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {isConnected && (
                                <Badge variant="secondary" className="text-xs">Online</Badge>
                              )}
                              <Badge variant="secondary">{participant.userId}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Acciones:</h4>
                  <div className="flex space-x-2">
                    <Button onClick={joinSession} variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-1" />
                      Unirse
                    </Button>
                    <Button onClick={() => setCurrentSession(null)} variant="outline" size="sm">
                      Nueva Sesión
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Items with Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Agregar Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Item</label>
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    onFocus={() => handleInputFocus('typing-item-name')}
                    onBlur={handleInputBlur}
                    placeholder="Ej: Hamburguesa, Bebida..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Precio</label>
                  <Input
                    type="text"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    onFocus={() => handleInputFocus('typing-item-amount')}
                    onBlur={handleInputBlur}
                    placeholder="$2000"
                  />
                </div>
                
                {/* Participant Selection */}
                {currentSession.participants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ¿Quiénes consumieron este item?
                    </label>
                    <div className="space-y-2">
                      {currentSession.participants.map((participant: Participant) => (
                        <div key={participant.id} className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant={selectedParticipants.includes(participant.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleParticipantSelection(participant.id)}
                            className="flex-1 justify-start"
                          >
                            {selectedParticipants.includes(participant.id) ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : (
                              <User className="w-4 h-4 mr-2" />
                            )}
                            {participant.name || participant.userId}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
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
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Agregando...' : 'Agregar Item'}
                </Button>
              </CardContent>
            </Card>

            {/* Items List with Assignment */}
            {currentSession.items.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Items en la Cuenta ({currentSession.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentSession.items.map((item: Item, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              Asignado a: {getParticipantNames(item.assignees || [])}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-green-600 text-lg">
                              {formatCurrency(item.amount)}
                            </span>
                            <div className="flex items-center justify-end mt-1 space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Edit Assignment Mode */}
                        {editingItem === item.id && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-2">Editar asignación:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {currentSession.participants.map((participant: Participant) => (
                                <Button
                                  key={participant.id}
                                  variant={(item.assignees || []).includes(participant.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    const currentAssignees = item.assignees || [];
                                    const newAssignees = currentAssignees.includes(participant.id)
                                      ? currentAssignees.filter(id => id !== participant.id)
                                      : [...currentAssignees, participant.id];
                                    updateItemAssignees(item.id, newAssignees);
                                  }}
                                >
                                  {(item.assignees || []).includes(participant.id) ? (
                                    <Check className="w-3 h-3 mr-1" />
                                  ) : (
                                    <X className="w-3 h-3 mr-1" />
                                  )}
                                  {participant.name || participant.userId}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span className="text-lg font-mono text-blue-600">
                          {formatCurrency(parseFloat(currentSession.totalAmount))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Split Calculator with Assignment Details + BLOCKCHAIN PAYMENTS */}
            {currentSession.participants.length > 0 && splits && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calculator className="w-5 h-5 mr-2" />
                      División de Pagos
                      {isConnected && (
                        <Badge className="ml-2" variant="outline">
                          <Wifi className="w-3 h-3 mr-1" />
                          Sincronizado
                        </Badge>
                      )}
                      {/* NUEVO: Indicador blockchain */}
                      {blockchainSessionId && walletConnected && (
                        <Badge className="ml-2" variant="outline">
                          <Link className="w-3 h-3 mr-1" />
                          Blockchain Ready
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm"
                        variant={splitMethod === 'proportional' ? 'default' : 'outline'}
                        onClick={() => calculateSplits('proportional')}
                      >
                        Proporcional
                      </Button>
                      <Button 
                        size="sm"
                        variant={splitMethod === 'equal' ? 'default' : 'outline'}
                        onClick={() => calculateSplits('equal')}
                      >
                        Igual
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Método:</span>
                          <p className="font-medium capitalize">{splits.method}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Participantes:</span>
                          <p className="font-medium">{splits.summary.participantCount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Promedio:</span>
                          <p className="font-medium">{formatCurrency(splits.summary.averageAmount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <p className="font-medium">{formatCurrency(splits.calculatedTotal)}</p>
                        </div>
                      </div>
                    </div>

                    {/* NUEVO: Botón de pago grupal */}
                    {showGroupPayButton && walletConnected && blockchainSessionId && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800">¡Todos han pagado!</h4>
                            <p className="text-sm text-green-600">Ejecuta el pago grupal para completar la transacción</p>
                          </div>
                          <Button
                            onClick={handleGroupPayment}
                            disabled={contractLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {contractLoading ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <Link className="w-4 h-4 mr-2" />
                                Ejecutar Pago Grupal
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Individual Splits con botones de pago */}
                    <div className="space-y-3">
                      {splits.participants.map((participant: Split, index: number) => {
                        const isCurrentUser = participant.userId === currentUserId;
                        const isConnected = connectedUsers.some((u: any) => u.userId === participant.userId);
                        const paymentState = paymentStates[participant.userId] || 'pending';
                        
                        return (
                          <div key={index} className={`border rounded-lg p-4 ${isCurrentUser ? 'border-blue-300 bg-blue-50' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <User className="w-4 h-4 mr-2 text-gray-500" />
                                <div>
                                  <h4 className="font-medium flex items-center">
                                    {participant.name}
                                    {isCurrentUser && (
                                      <Badge variant="outline" className="ml-2 text-xs">Tú</Badge>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-500">{participant.userId}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${isCurrentUser ? 'text-blue-600' : 'text-green-600'}`}>
                                  {formatCurrency(participant.amount)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {participant.percentage.toFixed(1)}% del total
                                </p>
                              </div>
                            </div>

                            {/* NUEVO: Botón de pago blockchain */}
                            {isCurrentUser && walletConnected && blockchainSessionId && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {paymentState === 'paid' ? (
                                      <Badge className="bg-green-600">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Pagado
                                      </Badge>
                                    ) : paymentState === 'paying' ? (
                                      <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                                        Procesando...
                                      </Badge>
                                    ) : paymentState === 'failed' ? (
                                      <Badge variant="destructive">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Error
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
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
                                      className="bg-purple-600 hover:bg-purple-700"
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
                                    >
                                      <Wallet className="w-4 h-4 mr-1" />
                                      Reintentar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* No wallet connected warning */}
                            {isCurrentUser && !walletConnected && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                                  <p className="text-sm text-yellow-800 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Conecta tu wallet para pagar con blockchain
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Items detail para método proporcional */}
                            {splits.method === 'proportional' && participant.items.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-gray-600 mb-2">Items asignados:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {participant.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                                      <span>{item.name}</span>
                                      <span>{formatCurrency(item.share)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Accuracy check */}
                    {Math.abs(splits.difference) > 0.01 && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          Diferencia de redondeo: {formatCurrency(splits.difference)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>QRSplit v3.0 - Blockchain MVP para Starknet Hackathon</p>
          <div className="mt-2 space-x-4">
            <span>QR Sharing: ✅</span>
            <span>Real-time Splits: {isConnected ? '✅' : '🔄'}</span>
            <span>Socket.io Sync: {isConnected ? '✅' : '❌'}</span>
            <span>Smart Contracts: {blockchainSessionId ? '✅' : '🔄'}</span>
            <span>Wallet Integration: {walletConnected ? '✅' : '❌'}</span>
            <span>Mobile Ready: ✅</span>
          </div>
        </div>
      </div>
    </div>
  );
}