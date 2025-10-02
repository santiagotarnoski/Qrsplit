import { create } from 'zustand';

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  walletName: string | null;
  error: string | null;
  setWalletState: (state: Partial<WalletState>) => void;
  resetWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  isConnecting: false,
  address: null,
  walletName: null,
  error: null,
  setWalletState: (newState) => set((state) => ({ ...state, ...newState })),
  resetWallet: () => set({
    isConnected: false,
    isConnecting: false,
    address: null,
    walletName: null,
    error: null,
  }),
}));