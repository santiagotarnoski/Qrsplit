import React from 'react';
import { Button } from '@app/components/ui/button';
import { Badge } from '@app/components/ui/badge';
import { 
  Wallet, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface WalletButtonProps {
  className?: string;
  size?: 'sm' | 'lg' | 'default';  // Corregido: tipos compatibles con Button
  variant?: 'default' | 'outline' | 'ghost';
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  className = '',
  size = 'default',  // Corregido: valor por defecto válido
  variant = 'default',
  onConnect,
  onDisconnect,
}) => {
  const {
    isConnected,
    isConnecting,
    address,
    walletName,
    error,
    connectWallet,
    disconnectWallet,
    formatAddress,
  } = useWallet();

  const handleConnect = async () => {
    await connectWallet();
    if (onConnect && address) {
      onConnect(address);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Estado desconectado
  if (!isConnected) {
    return (
      <div className={className}>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          variant={variant}
          size={size}
          className="flex items-center space-x-2"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Conectar Wallet</span>
            </>
          )}
        </Button>

        {error && (
          <div className="absolute top-full mt-2 left-0 right-0 z-50">
            <div className="bg-red-50 border border-red-200 p-2 rounded text-sm max-w-xs">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium mb-1">Error conectando wallet</p>
                  <p className="text-red-700 text-xs">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConnect}
                    className="mt-2 text-xs"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Estado conectado - versión simple
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
        <CheckCircle2 className="w-3 h-3" />
        <span>{walletName}</span>
      </Badge>
      
      <Badge variant="secondary" className="font-mono text-xs">
        {formatAddress(address)}
      </Badge>

      <Button
        onClick={handleDisconnect}
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700"
      >
        Desconectar
      </Button>
    </div>
  );
};