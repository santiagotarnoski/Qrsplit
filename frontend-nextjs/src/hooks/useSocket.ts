'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// Tipos globales
declare global {
  interface Window {
    io: any;
  }
}

let io: any;
if (typeof window !== 'undefined') {
  io = require('socket.io-client').io;
}

interface SocketUser {
  userId: string;
  userName: string;
  connectedAt?: string;
}

interface UseSocketReturn {
  socket: any;
  isConnected: boolean;
  connectedUsers: SocketUser[];
  lastUpdate: any;
  notifications: string[];
  joinSession: (sessionId: string, userId: string, userName: string) => void;
  leaveSession: () => void;
  sendTyping: (action?: string) => void;
  stopTyping: () => void;
  clearNotifications: () => void;
  removeNotification: (index: number) => void;
  emit: (event: string, data?: any) => void;
}

export const useSocket = (): UseSocketReturn => {
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<SocketUser[]>([]);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !io) return;

    // 🔥 BACKEND DEPLOY DE RENDER:
    const socket = io('https://qrsplit-backend.onrender.com', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      setIsConnected(true);
      addNotification('Conectado al servidor en tiempo real');
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Socket desconectado:', reason);
      setIsConnected(false);
      setConnectedUsers([]);
      if (reason !== 'io client disconnect') {
        addNotification('Conexión perdida, reintentando...');
      }
    });

    socket.on('connect_error', (error: any) => {
      console.error('Error de conexión:', error);
      setIsConnected(false);
      addNotification('Error de conexión con el servidor');
    });

    socket.on('reconnect', (attemptNumber: number) => {
      console.log('Reconectado después de', attemptNumber, 'intentos');
      addNotification('Reconectado exitosamente');
    });

    socket.on('session-updated', (data: any) => {
      console.log('Session updated:', data);
      setLastUpdate(data);

      switch (data.type) {
        case 'participant-joined':
          addNotification(`${data.data.participant.name || data.data.participant.userId} se unió`);
          break;
        case 'item-added':
          addNotification(`${data.data.item.name} agregado`);
          break;
        case 'item-assignees-updated':
          addNotification(`Asignaciones actualizadas para ${data.data.item.name}`);
          break;
        case 'splits-calculated':
          addNotification('División de pagos actualizada');
          break;
        default:
          addNotification('Sesión actualizada');
          break;
      }
    });

    socket.on('user-connected', (data: any) => {
      console.log('Usuario conectado:', data);
      setConnectedUsers(prev => [
        ...prev.filter(u => u.userId !== data.userId),
        {
          userId: data.userId,
          userName: data.userName,
          connectedAt: data.timestamp,
        },
      ]);
      addNotification(`${data.userName} se conectó`);
    });

    socket.on('user-disconnected', (data: any) => {
      console.log('Usuario desconectado:', data);
      setConnectedUsers(prev => prev.filter(u => u.userId !== data.userId));
      addNotification(`${data.userName} se desconectó`);
    });

    socket.on('user-typing', (data: any) => {
      console.log('Usuario escribiendo:', data);
    });

    socket.on('user-stopped-typing', (data: any) => {
      console.log('Usuario dejó de escribir:', data);
    });

    socket.on('session-sync', (data: any) => {
      console.log('Session sync:', data);
      setLastUpdate({
        type: 'session-sync',
        session: data.session,
        splits: data.splits,
        connectedUsers: data.connectedUsers,
      });
    });

    socket.on('server-shutdown', (data: any) => {
      console.log('Server shutdown:', data);
      addNotification('Servidor reiniciándose, reconectando...');
    });

    socket.on('pong', (data: any) => {
      console.log('Pong recibido:', data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addNotification]);

  const joinSession = useCallback((sessionId: string, userId: string, userName: string) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn('Socket no disponible para unirse a sesión');
      return;
    }

    console.log(`Uniéndose a sesión: ${sessionId} como ${userName}`);
    socket.emit('join-session', { sessionId, userId, userName });
  }, []);

  const leaveSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('Saliendo de sesión');
    socket.emit('leave-session');
    setConnectedUsers([]);
  }, []);

  const sendTyping = useCallback((action = 'typing') => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('typing-start', { action });
  }, []);

  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('typing-stop');
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(event, data);
  }, []);

  // Heartbeat
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      emit('ping');
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected, emit]);

  return {
    socket: socketRef.current,
    isConnected,
    connectedUsers,
    lastUpdate,
    notifications,
    joinSession,
    leaveSession,
    sendTyping,
    stopTyping,
    clearNotifications,
    removeNotification,
    emit,
  };
};
