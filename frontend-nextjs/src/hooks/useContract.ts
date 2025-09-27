import { useState, useCallback } from 'react';
import { contractService, simulateTransactionDelay, SessionInfo, PaymentStatus, ParticipantPayment } from '../services/contractService';
import { useWallet } from './useWallet';

interface ContractState {
  isLoading: boolean;
  error: string | null;
  lastTxHash: string | null;
}

// NUEVO: Interfaz para respuestas de contrato
interface ContractResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface UseContractReturn extends ContractState {
  // Session management - MODIFICADO: ahora retornan ContractResult
  createSession: (sessionId: string, merchantId: string, merchantAddress: string, totalAmount: number) => Promise<ContractResult>;
  joinSession: (sessionId: string, participantAddress: string, amountOwed: number) => Promise<ContractResult>;
  
  // Payment functions - MODIFICADO: ahora retornan ContractResult
  makePayment: (sessionId: string, participantAddress: string) => Promise<ContractResult>;
  executeGroupPayment: (sessionId: string) => Promise<ContractResult>;
  
  // Query functions
  getSession: (sessionId: string) => Promise<SessionInfo | null>;
  getPaymentStatus: (sessionId: string) => Promise<PaymentStatus>;
  getSessionParticipants: (sessionId: string) => Promise<ParticipantPayment[]>;
  hasParticipantPaid: (sessionId: string, participantAddress?: string) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
  clearAllData: () => void;
}

export const useContract = (): UseContractReturn => {
  const [contractState, setContractState] = useState<ContractState>({
    isLoading: false,
    error: null,
    lastTxHash: null,
  });

  const { address: walletAddress, isConnected: walletConnected } = useWallet();

  // Helper para manejar operaciones del contrato - MODIFICADO
  const executeContractOperation = useCallback(async (
    operation: () => Promise<{ success: boolean; txHash?: string; error?: string }>,
    successMessage?: string
  ): Promise<ContractResult> => {
    if (!walletConnected || !walletAddress) {
      const errorResult = { success: false, error: 'Wallet not connected' };
      setContractState(prev => ({ ...prev, error: errorResult.error! }));
      return errorResult;
    }

    setContractState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Simular delay de transacción
      await simulateTransactionDelay(1500);
      
      const result = await operation();
      
      if (result.success) {
        setContractState({
          isLoading: false,
          error: null,
          lastTxHash: result.txHash || null,
        });
        
        if (successMessage) {
          console.log(`✅ [CONTRACT] ${successMessage}`, { txHash: result.txHash });
        }
        
        return { success: true, txHash: result.txHash };
      } else {
        setContractState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Transaction failed',
        }));
        return { success: false, error: result.error || 'Transaction failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setContractState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [walletConnected, walletAddress]);

  // Crear sesión en el contrato - MODIFICADO: agregado merchantAddress
  const createSession = useCallback(async (
    sessionId: string, 
    merchantId: string,
    merchantAddress: string, 
    totalAmount: number
  ): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.createSession(sessionId, merchantId, merchantAddress, totalAmount),
      `Session created: ${sessionId}`
    );
  }, [executeContractOperation]);

  // Unirse a sesión - MODIFICADO: agregado participantAddress
  const joinSession = useCallback(async (
    sessionId: string,
    participantAddress: string, 
    amountOwed: number
  ): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.joinSession(sessionId, participantAddress, amountOwed),
      `Joined session: ${sessionId}`
    );
  }, [executeContractOperation]);

  // Realizar pago individual - MODIFICADO: agregado participantAddress
  const makePayment = useCallback(async (
    sessionId: string,
    participantAddress: string
  ): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.makePayment(sessionId, participantAddress),
      `Payment made for session: ${sessionId}`
    );
  }, [executeContractOperation]);

  // Ejecutar pago grupal - MODIFICADO: retorna ContractResult
  const executeGroupPayment = useCallback(async (sessionId: string): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.executeGroupPayment(sessionId),
      `Group payment executed for session: ${sessionId}`
    );
  }, [executeContractOperation]);

  // Obtener información de sesión
  const getSession = useCallback(async (sessionId: string): Promise<SessionInfo | null> => {
    try {
      return await contractService.getSession(sessionId);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }, []);

  // Obtener estado de pagos
  const getPaymentStatus = useCallback(async (sessionId: string): Promise<PaymentStatus> => {
    try {
      return await contractService.getPaymentStatus(sessionId);
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        total_participants: 0,
        paid_participants: 0,
        total_collected: 0,
        is_fully_paid: false,
      };
    }
  }, []);

  // Obtener participantes de sesión
  const getSessionParticipants = useCallback(async (sessionId: string): Promise<ParticipantPayment[]> => {
    try {
      return await contractService.getSessionParticipants(sessionId);
    } catch (error) {
      console.error('Error getting session participants:', error);
      return [];
    }
  }, []);

  // Verificar si participante pagó
  const hasParticipantPaid = useCallback(async (
    sessionId: string, 
    participantAddress?: string
  ): Promise<boolean> => {
    try {
      const address = participantAddress || walletAddress;
      if (!address) return false;
      
      return await contractService.hasParticipantPaid(sessionId, address);
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }, [walletAddress]);

  // Limpiar error
  const clearError = useCallback(() => {
    setContractState(prev => ({ ...prev, error: null }));
  }, []);

  // Limpiar todos los datos (para testing)
  const clearAllData = useCallback(() => {
    contractService.clearAllData();
    setContractState({
      isLoading: false,
      error: null,
      lastTxHash: null,
    });
  }, []);

  return {
    ...contractState,
    createSession,
    joinSession,
    makePayment,
    executeGroupPayment,
    getSession,
    getPaymentStatus,
    getSessionParticipants,
    hasParticipantPaid,
    clearError,
    clearAllData,
  };
};