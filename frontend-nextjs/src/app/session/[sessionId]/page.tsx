'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Users, ArrowLeft } from 'lucide-react';
import { WalletButton } from '../../../components/WalletButton'; // ✅ ruta corregida

interface Session {
  id: string;
  sessionId: string;
  merchantId: string;
  status: string;
  totalAmount: string;
  participantsCount: number;
  participants: any[];
  items: any[];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Sesión no encontrada');
      }
      const data = await response.json();
      setSession(data.session || data); // Compatibilidad con diferentes formatos
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando sesión');
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!userName.trim()) return;
    
    setJoining(true);
    try {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          name: userName.trim(),
          wallet_address: null
        }),
      });

      if (!response.ok) {
        throw new Error('Error uniéndose a la sesión');
      }

      const joinResult = await response.json();
      console.log('✅ [JOIN] Usuario unido exitosamente:', joinResult);
      
      const params = new URLSearchParams({
        sessionId: sessionId,
        userName: userName.trim(),
        userId: userId,
        joined: 'true'
      });
      
      router.push(`/?${params.toString()}`);
      
    } catch (err) {
      console.error('❌ [JOIN] Error:', err);
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    } finally {
      setJoining(false);
    }
  };

  // 👉 Lógica del Pago Grupal
  const executeGroupPayment = async () => {
    try {
      console.log("💸 Ejecutando pago grupal...");

      // Aquí iría la lógica real de Starknet / backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Actualizar estado local para que el botón desaparezca
      setSession(prev => prev ? { ...prev, status: "paid" } : prev);

      // Notificación
      alert("🎉 Pago grupal completado!");
    } catch (err) {
      console.error("❌ Error en el pago grupal", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Sesión no encontrada</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QRSplit</h1>
          <p className="text-gray-600">Únete a la sesión de pago grupal</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Información de la Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><strong>Local:</strong> {session.merchantId}</div>
              <div><strong>Estado:</strong> {session.status}</div>
              <div><strong>Participantes:</strong> {session.participantsCount}</div>
              <div><strong>Total:</strong> ${parseFloat(session.totalAmount).toFixed(2)}</div>
            </div>
            
            {session.participants && session.participants.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Participantes actuales:</h4>
                <div className="space-y-1">
                  {session.participants.map((participant: any, index: number) => (
                    <div key={index} className="flex items-center text-sm bg-blue-50 p-2 rounded">
                      <Users className="w-4 h-4 mr-2 text-blue-600" />
                      <span>{participant.name || participant.userId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {session.items && session.items.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Items en la cuenta:</h4>
                <div className="space-y-1">
                  {session.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{item.name}</span>
                      <span className="font-mono">${parseFloat(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* 👇 Pago con Blockchain */}
                {parseFloat(session.totalAmount) > 0 && (
                  <div className="mt-6 p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium mb-2">Pagar con Blockchain</h4>

                    {/* Mensaje dinámico */}
                    {session.participants.some((p: any) => p.wallet_address) ? (
                      <p className="text-sm text-green-700 mb-3">
                        ✅ Wallet conectada. Ya puedes ejecutar el pago.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mb-3">
                        Conecta tu wallet para abonar el total en crypto.
                      </p>
                    )}

                    <div className="flex justify-center">
                      <WalletButton
                        size="lg"
                        onConnect={(address: string) => {
                          console.log("✅ Wallet conectada:", address);
                          // 🔑 Actualizar participante actual con wallet
                          setSession(prev =>
                            prev
                              ? {
                                  ...prev,
                                  participants: prev.participants.map(p =>
                                    p.name === userName
                                      ? { ...p, wallet_address: address }
                                      : p
                                  ),
                                }
                              : prev
                          );
                        }}
                        onDisconnect={() => {
                          console.log("👋 Wallet desconectada");
                          setSession(prev =>
                            prev
                              ? {
                                  ...prev,
                                  participants: prev.participants.map(p =>
                                    p.name === userName
                                      ? { ...p, wallet_address: null }
                                      : p
                                  ),
                                }
                              : prev
                          );
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 👇 Botón de pago grupal */}
                {session.status !== "paid" && (
                  <div className="mt-4 p-4 bg-green-50 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium text-green-700">¡Todos han pagado!</p>
                      <p className="text-sm text-green-600">
                        Ejecuta el pago grupal para completar la transacción
                      </p>
                    </div>
                    <Button 
                      onClick={executeGroupPayment} 
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      Ejecutar Pago Grupal
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unirse a la Sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tu nombre</label>
              <Input
                value={userName}
                onChange={(e: any) => setUserName(e.target.value)}
                placeholder="Ingresa tu nombre"
                onKeyDown={(e: any) => e.key === 'Enter' && joinSession()}
                disabled={joining}
              />
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={joinSession} 
                disabled={joining || !userName.trim()}
                className="flex-1"
              >
                {joining ? 'Uniéndose...' : 'Unirse a la Sesión'}
              </Button>
              
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
