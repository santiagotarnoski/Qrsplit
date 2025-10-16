'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Users, ArrowLeft, ShoppingBag } from 'lucide-react';
import Plasma from '../../plasma';

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

  // 🔹 Base URL dinámica
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Sesión no encontrada');
      const data = await response.json();
      setSession(data.session || data);
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

      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: userName.trim(),
        }),
      });

      if (!response.ok) throw new Error('Error uniéndose a la sesión');

      const qs = new URLSearchParams({
        sessionId,
        userName: userName.trim(),
        userId,
        joined: 'true',
      });

      router.push(`/app?${qs.toString()}`);
    } catch (err) {
      console.error('❌ [JOIN] Error:', err);
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <Plasma color="#6366f1" speed={0.6} direction="forward" scale={1.1} opacity={0.6} mouseInteractive />
        <div
          className="fixed inset-0 bg-gradient-to-b from-black/40 via-purple-900/20 to-black/40 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 2 }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white">Cargando sesión...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-black relative">
        <Plasma color="#ef4444" speed={0.6} direction="forward" scale={1.1} opacity={0.5} mouseInteractive />
        <div
          className="fixed inset-0 bg-gradient-to-b from-black/40 via-red-900/20 to-black/40 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div className="relative flex items-center justify-center min-h-screen p-4" style={{ zIndex: 2 }}>
          <Card className="max-w-md w-full bg-slate-800/40 backdrop-blur-sm border-red-500/40">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold text-red-400 mb-4">Sesión no encontrada</h2>
              <p className="text-slate-300 mb-4">{error}</p>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <Plasma color="#6366f1" speed={0.6} direction="forward" scale={1.1} opacity={0.6} mouseInteractive />
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/40 via-purple-900/20 to-black/40 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      <div className="relative p-4" style={{ zIndex: 2 }}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">QRSplit</h1>
            <p className="text-slate-300">Únete a la sesión de pago grupal</p>
          </div>

          <Card className="mb-6 bg-slate-800/30 backdrop-blur-sm border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="w-5 h-5 mr-2" />
                Información de la Sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4 text-slate-300">
                <div>
                  <strong className="text-white">Local:</strong> {session.merchantId}
                </div>
                <div>
                  <strong className="text-white">Estado:</strong> {session.status}
                </div>
                <div>
                  <strong className="text-white">Participantes:</strong> {session.participantsCount}
                </div>
                <div>
                  <strong className="text-white">Total:</strong> ${parseFloat(session.totalAmount).toFixed(2)}
                </div>
              </div>

              {session.participants && session.participants.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-white">Participantes actuales:</h4>
                  <div className="space-y-1">
                    {session.participants.map((participant: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center text-sm bg-purple-500/10 border border-purple-500/20 p-2 rounded"
                      >
                        <Users className="w-4 h-4 mr-2 text-purple-400" />
                        <span className="text-slate-200">{participant.name || participant.userId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {session.items && session.items.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2 text-white flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Items en la cuenta:
                  </h4>
                  <div className="space-y-1">
                    {session.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm bg-slate-700/30 p-2 rounded">
                        <span className="text-slate-200">{item.name}</span>
                        <span className="font-mono text-slate-300">${parseFloat(item.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 backdrop-blur-sm border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Unirse a la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200">Tu nombre</label>
                <Input
                  value={userName}
                  onChange={(e: any) => setUserName(e.target.value)}
                  placeholder="Ingresa tu nombre"
                  onKeyDown={(e: any) => e.key === 'Enter' && joinSession()}
                  disabled={joining}
                  className="bg-slate-700/30 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={joinSession}
                  disabled={joining || !userName.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {joining ? 'Uniéndose...' : 'Unirse a la Sesión'}
                </Button>

                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                </Button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400 text-center">
                  Después de unirte, podrás conectar tu wallet y pagar tu parte en el app principal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
