import { useEffect, useState } from 'react';
import { X, Wifi, WifiOff, Users, Bell, CheckCircle } from 'lucide-react';
import { Badge } from '@app/components/ui/badge';

interface SocketUser {
  userId: string;
  userName: string;
  connectedAt?: string;
}

interface NotificationProps {
  isConnected: boolean;
  connectedUsers: SocketUser[];
  notifications: string[];
  onRemoveNotification: (index: number) => void;
  onClearNotifications: () => void;
}

export const RealtimeNotifications: React.FC<NotificationProps> = ({
  isConnected,
  connectedUsers,
  notifications,
  onRemoveNotification,
  onClearNotifications
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  // Auto-show notifications cuando hay nuevas
  useEffect(() => {
    if (notifications.length > 0) {
      setShowNotifications(true);
    }
  }, [notifications.length]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Status Indicator */}
      <div className="flex items-center justify-end space-x-2">
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className="flex items-center space-x-1"
        >
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
        </Badge>

        {/* Connected Users Counter */}
        {isConnected && connectedUsers.length > 0 && (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{connectedUsers.length} conectados</span>
          </Badge>
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
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-2 bg-blue-50 rounded text-sm"
              >
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
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

      {/* Connected Users Panel - Solo mostrar si hay usuarios conectados */}
      {isConnected && connectedUsers.length > 0 && showNotifications && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-medium text-gray-900 flex items-center mb-3">
            <Users className="w-4 h-4 mr-2" />
            Usuarios conectados ({connectedUsers.length})
          </h3>
          <div className="space-y-2">
            {connectedUsers.map((user, index) => (
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