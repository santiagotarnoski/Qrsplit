import { useState, useEffect, useCallback } from 'react';

// Tipos básicos para wallet
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  walletName: string | null;
  error: string | null;
}

interface UseWalletReturn extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  formatAddress: (address: string | null) => string;
}

export const useWallet = (): UseWalletReturn => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    walletName: null,
    error: null,
  });

  // Función para formatear direcciones
  const formatAddress = useCallback((address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Función para conectar wallet real
  const connectWallet = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('🔌 [WALLET] Iniciando conexión con Starknet...');
      
      // Verificar entorno del navegador
      if (typeof window === 'undefined') {
        throw new Error('Wallet solo funciona en el navegador');
      }

      // Importar get-starknet dinámicamente
      let connect;
      try {
        const starknetLib = await import('get-starknet');
        connect = starknetLib.connect;
      } catch (error) {
        console.error('Error importando get-starknet:', error);
        throw new Error('Librerías de Starknet no disponibles. Asegúrate de tener get-starknet instalado.');
      }

      // Intentar conectar con la wallet
      const starknet = await connect({
        modalMode: 'canAsk',
        modalTheme: 'light',
      });

      if (!starknet) {
        throw new Error('No se encontró ninguna wallet de Starknet. Instala Argent X o Braavos.');
      }

      console.log('🔍 [WALLET] Wallet detectada:', (starknet as any).name || 'Unknown');

      // Habilitar la conexión y obtener dirección
      let accounts: string[] = [];
      try {
        if (typeof (starknet as any).enable === 'function') {
          accounts = await (starknet as any).enable();
        }
      } catch (enableError) {
        console.log('Error con enable, intentando métodos alternativos');
      }

      // Obtener dirección de múltiples formas posibles
      let address: string;
      if (accounts && accounts.length > 0) {
        address = accounts[0];
      } else if ((starknet as any).selectedAddress) {
        address = (starknet as any).selectedAddress;
      } else if ((starknet as any).account?.address) {
        address = (starknet as any).account.address;
      } else {
        throw new Error('No se pudo obtener la dirección de la wallet');
      }

      console.log('✅ [WALLET] Conectada exitosamente:', {
        name: (starknet as any).name || 'Unknown',
        address: address,
        accounts: accounts.length
      });

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        address: address,
        walletName: (starknet as any).name || 'Starknet Wallet',
        error: null,
      }));

      // Guardar en localStorage para persistencia
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('qrsplit_wallet_connected', 'true');
        localStorage.setItem('qrsplit_wallet_address', address);
        localStorage.setItem('qrsplit_wallet_name', (starknet as any).name || 'Starknet Wallet');
      }

    } catch (error) {
      console.error('❌ [WALLET] Error conectando:', error);
      
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Mensajes de error más amigables
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        errorMessage = 'Conexión cancelada por el usuario';
      } else if (errorMessage.includes('No wallet') || errorMessage.includes('No se encontró')) {
        errorMessage = 'No se encontró wallet. Instala Argent X o Braavos.';
      } else if (errorMessage.includes('not available') || errorMessage.includes('no disponibles')) {
        errorMessage = 'Librerías de Starknet no disponibles. Verifica la instalación.';
      }
      
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Función para desconectar wallet
  const disconnectWallet = useCallback(async () => {
    try {
      console.log('🔌 [WALLET] Desconectando...');
      
      // Limpiar estado
      setWalletState({
        isConnected: false,
        isConnecting: false,
        address: null,
        walletName: null,
        error: null,
      });

      // Limpiar localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('qrsplit_wallet_connected');
        localStorage.removeItem('qrsplit_wallet_address');
        localStorage.removeItem('qrsplit_wallet_name');
      }

      console.log('✅ [WALLET] Desconectada');

    } catch (error) {
      console.error('❌ [WALLET] Error desconectando:', error);
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconectando',
      }));
    }
  }, []);

  // Auto-reconexión al cargar la página
  useEffect(() => {
    const autoReconnect = async () => {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

      const wasConnected = localStorage.getItem('qrsplit_wallet_connected') === 'true';
      const savedAddress = localStorage.getItem('qrsplit_wallet_address');
      const savedWalletName = localStorage.getItem('qrsplit_wallet_name');

      if (wasConnected && savedAddress && savedWalletName) {
        console.log('🔄 [WALLET] Intentando reconexión automática...');
        
        try {
          // Importar get-starknet
          const starknetLib = await import('get-starknet');
          const connect = starknetLib.connect;

          // Intentar conectar silenciosamente
          const starknet = await connect({ 
            modalMode: 'neverAsk'
          });

          if (starknet) {
            // Verificar si la dirección coincide
            let currentAddress: string | null = null;
            
            // Obtener dirección de múltiples formas posibles
            if ((starknet as any).selectedAddress) {
              currentAddress = (starknet as any).selectedAddress;
            } else if ((starknet as any).account?.address) {
              currentAddress = (starknet as any).account.address;
            }
            
            if (currentAddress === savedAddress) {
              setWalletState({
                isConnected: true,
                isConnecting: false,
                address: savedAddress,
                walletName: savedWalletName,
                error: null,
              });

              console.log('✅ [WALLET] Reconexión automática exitosa');
            } else {
              // Si no coincide la dirección, limpiar localStorage
              localStorage.removeItem('qrsplit_wallet_connected');
              localStorage.removeItem('qrsplit_wallet_address');
              localStorage.removeItem('qrsplit_wallet_name');
            }
          }
        } catch (error) {
          console.log('⚠️ [WALLET] Reconexión automática falló, limpiando localStorage');
          localStorage.removeItem('qrsplit_wallet_connected');
          localStorage.removeItem('qrsplit_wallet_address');
          localStorage.removeItem('qrsplit_wallet_name');
        }
      }
    };

    // Ejecutar después de que el componente se monte
    const timeoutId = setTimeout(autoReconnect, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Escuchar cambios de cuenta en la wallet
  useEffect(() => {
    let starknetInstance: any = null;

    const handleAccountChange = (accounts: string[]) => {
      console.log('🔄 [WALLET] Cuenta cambiada:', accounts);
      
      if (walletState.isConnected) {
        if (accounts.length > 0) {
          // Actualizar con nueva cuenta
          setWalletState(prev => ({
            ...prev,
            address: accounts[0],
          }));
          
          // Actualizar localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('qrsplit_wallet_address', accounts[0]);
          }
        } else {
          // Usuario desconectó desde la wallet
          disconnectWallet();
        }
      }
    };

    const setupEventListeners = async () => {
      try {
        const starknetLib = await import('get-starknet');
        const connect = starknetLib.connect;
        
        starknetInstance = await connect({ modalMode: 'neverAsk' });
        if (starknetInstance && typeof (starknetInstance as any).on === 'function') {
          (starknetInstance as any).on('accountsChanged', handleAccountChange);
        }
      } catch (error) {
        // Ignorar errores silenciosos de conexión
        console.log('No se pudo configurar listeners de wallet');
      }
    };

    if (typeof window !== 'undefined') {
      setupEventListeners();
    }

    return () => {
      if (starknetInstance && typeof (starknetInstance as any).off === 'function') {
        (starknetInstance as any).off('accountsChanged', handleAccountChange);
      }
    };
  }, [walletState.isConnected, disconnectWallet]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    formatAddress,
  };
};