'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Users, ArrowLeft } from 'lucide-react';

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
      setSession(data);
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
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: `user_${Date.now()}`,
          name: userName.trim(),
          wallet_address: null
        }),
      });

      if (!response.ok) {
        throw new Error('Error uniéndose a la sesión');
      }

      await response.json();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uniéndose a sesión');
    } finally {
      setJoining(false);
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
              <div><strong>ID:</strong> {session.sessionId.slice(-8)}...</div>
              <div><strong>Estado:</strong> {session.status}</div>
              <div><strong>Participantes:</strong> {session.participantsCount}</div>
              <div><strong>Total:</strong> ${session.totalAmount}</div>
            </div>
            
            {session.items.length > 0 && (
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
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}