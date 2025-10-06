import { useState, useCallback } from 'react';
import {
  contractService,
  simulateTransactionDelay,
  SessionInfo,
  PaymentStatus,
  ParticipantPayment
} from '../services/contractService';
import { useWallet } from './useWallet';

interface ContractState {
  isLoading: boolean;
  error: string | null;
  lastTxHash: string | null;
}

interface ContractResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface UseContractReturn extends ContractState {
  createSession: (sessionId: string, merchantId: string, merchantAddress: string, totalAmount: number) => Promise<ContractResult>;
  joinSession: (sessionId: string, participantAddress: string, amountOwed: number) => Promise<ContractResult>;
  makePayment: (sessionId: string, participantAddress: string) => Promise<ContractResult>;
  executeGroupPayment: (sessionId: string) => Promise<ContractResult>;

  getSession: (sessionId: string) => Promise<SessionInfo | null>;
  getPaymentStatus: (sessionId: string) => Promise<PaymentStatus>;
  getSessionParticipants: (sessionId: string) => Promise<ParticipantPayment[]>;
  hasParticipantPaid: (sessionId: string, participantAddress?: string) => Promise<boolean>;

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
      await simulateTransactionDelay(500);
      const result = await operation();

      if (result.success) {
        setContractState({
          isLoading: false,
          error: null,
          lastTxHash: result.txHash || null,
        });
        if (successMessage) {
          console.log(`✅ ${successMessage}`, { txHash: result.txHash });
        }
        return { success: true, txHash: result.txHash };
      } else {
        const err = result.error || 'Transaction failed';
        setContractState(prev => ({ ...prev, isLoading: false, error: err }));
        return { success: false, error: err };
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Unknown error';
      setContractState(prev => ({ ...prev, isLoading: false, error: err }));
      return { success: false, error: err };
    }
  }, [walletConnected, walletAddress]);

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

  const makePayment = useCallback(async (
    sessionId: string,
    participantAddress: string
  ): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.makePayment(sessionId, participantAddress),
      `Payment made for session: ${sessionId}`
    );
  }, [executeContractOperation]);

  const executeGroupPayment = useCallback(async (sessionId: string): Promise<ContractResult> => {
    return executeContractOperation(
      () => contractService.executeGroupPayment(sessionId),
      `Group payment executed for session: ${sessionId}`
    );
  }, [executeContractOperation]);

  // Reads
  const getSession = useCallback(async (sessionId: string): Promise<SessionInfo | null> => {
    try {
      return await contractService.getSession(sessionId);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }, []);

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

  const getSessionParticipants = useCallback(async (sessionId: string): Promise<ParticipantPayment[]> => {
    try {
      return await contractService.getSessionParticipants(sessionId);
    } catch (error) {
      console.error('Error getting session participants:', error);
      return [];
    }
  }, []);

  const hasParticipantPaid = useCallback(async (
    sessionId: string,
    participantAddress?: string
  ): Promise<boolean> => {
    try {
      const addr = participantAddress || walletAddress;
      if (!addr) return false;
      return await contractService.hasParticipantPaid(sessionId, addr);
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }, [walletAddress]);

  const clearError = useCallback(() => {
    setContractState(prev => ({ ...prev, error: null }));
  }, []);

  const clearAllData = useCallback(() => {
    contractService.clearAllData();
    setContractState({ isLoading: false, error: null, lastTxHash: null });
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
