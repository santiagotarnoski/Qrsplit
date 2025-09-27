// Tipos que coinciden con el smart contract Cairo
export interface SessionInfo {
  session_id: string;
  merchant: string;
  merchant_id: string;
  total_amount: number;
  participants_count: number;
  payments_received: number;
  created_at: number;
  is_active: boolean;
  is_completed: boolean;
}

export interface PaymentStatus {
  total_participants: number;
  paid_participants: number;
  total_collected: number;
  is_fully_paid: boolean;
}

export interface ParticipantPayment {
  participant: string;
  amount: number;
  has_paid: boolean;
}

// Simulación local del smart contract
class QRSplitContractService {
  private sessions: Map<string, SessionInfo> = new Map();
  private participantAmounts: Map<string, number> = new Map();
  private participantPayments: Map<string, boolean> = new Map();
  private sessionParticipants: Map<string, string[]> = new Map();

  // Simular create_session del smart contract
  async createSession(
    sessionId: string,
    merchantId: string,
    merchantAddress: string,
    totalAmount: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('📝 [CONTRACT] Creating session:', { sessionId, merchantId, totalAmount });
      
      // Verificar que la sesión no exista
      if (this.sessions.has(sessionId)) {
        return { success: false, error: 'Session already exists' };
      }

      // Crear sesión
      const session: SessionInfo = {
        session_id: sessionId,
        merchant: merchantAddress,
        merchant_id: merchantId,
        total_amount: totalAmount,
        participants_count: 0,
        payments_received: 0,
        created_at: Date.now() / 1000,
        is_active: true,
        is_completed: false,
      };

      this.sessions.set(sessionId, session);
      this.sessionParticipants.set(sessionId, []);

      console.log('✅ [CONTRACT] Session created:', session);
      
      // Simular hash de transacción
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
      
      return { success: true, txHash: mockTxHash };
    } catch (error) {
      console.error('❌ [CONTRACT] Error creating session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Simular join_session del smart contract
  async joinSession(
    sessionId: string,
    participantAddress: string,
    amountOwed: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('🚀 [CONTRACT] Joining session:', { sessionId, participantAddress, amountOwed });

      const session = this.sessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (!session.is_active) {
        return { success: false, error: 'Session is not active' };
      }

      // Verificar que el participante no exista ya
      const participantKey = `${sessionId}-${participantAddress}`;
      if (this.participantAmounts.has(participantKey)) {
        return { success: false, error: 'Participant already exists' };
      }

      // Agregar participante
      this.participantAmounts.set(participantKey, amountOwed);
      this.participantPayments.set(participantKey, false);
      
      const participants = this.sessionParticipants.get(sessionId) || [];
      participants.push(participantAddress);
      this.sessionParticipants.set(sessionId, participants);

      // Actualizar sesión
      session.participants_count += 1;
      this.sessions.set(sessionId, session);

      console.log('✅ [CONTRACT] Participant joined:', { sessionId, participantAddress });
      
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
      return { success: true, txHash: mockTxHash };
    } catch (error) {
      console.error('❌ [CONTRACT] Error joining session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Simular make_payment del smart contract
  async makePayment(
    sessionId: string,
    participantAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('💰 [CONTRACT] Making payment:', { sessionId, participantAddress });

      const session = this.sessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (!session.is_active) {
        return { success: false, error: 'Session is not active' };
      }

      const participantKey = `${sessionId}-${participantAddress}`;
      const amountOwed = this.participantAmounts.get(participantKey);
      if (!amountOwed) {
        return { success: false, error: 'Participant not found' };
      }

      const hasPaid = this.participantPayments.get(participantKey);
      if (hasPaid) {
        return { success: false, error: 'Participant already paid' };
      }

      // Marcar como pagado
      this.participantPayments.set(participantKey, true);

      // Actualizar pagos recibidos
      session.payments_received += amountOwed;
      this.sessions.set(sessionId, session);

      console.log('✅ [CONTRACT] Payment made:', { sessionId, participantAddress, amount: amountOwed });
      
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
      return { success: true, txHash: mockTxHash };
    } catch (error) {
      console.error('❌ [CONTRACT] Error making payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Simular execute_group_payment del smart contract
  async executeGroupPayment(
    sessionId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('⚡ [CONTRACT] Executing group payment:', { sessionId });

      const session = this.sessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (!session.is_active) {
        return { success: false, error: 'Session is not active' };
      }

      // Verificar que todos hayan pagado
      const paymentStatus = await this.getPaymentStatus(sessionId);
      if (!paymentStatus.is_fully_paid) {
        return { success: false, error: 'Not all participants have paid' };
      }

      // Marcar sesión como completada
      session.is_active = false;
      session.is_completed = true;
      this.sessions.set(sessionId, session);

      console.log('✅ [CONTRACT] Group payment executed:', { sessionId, total: session.payments_received });
      
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
      return { success: true, txHash: mockTxHash };
    } catch (error) {
      console.error('❌ [CONTRACT] Error executing group payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Obtener información de sesión
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    return this.sessions.get(sessionId) || null;
  }

  // Obtener cantidad adeudada por participante
  async getParticipantAmount(sessionId: string, participantAddress: string): Promise<number> {
    const participantKey = `${sessionId}-${participantAddress}`;
    return this.participantAmounts.get(participantKey) || 0;
  }

  // Verificar si participante ya pagó
  async hasParticipantPaid(sessionId: string, participantAddress: string): Promise<boolean> {
    const participantKey = `${sessionId}-${participantAddress}`;
    return this.participantPayments.get(participantKey) || false;
  }

  // Obtener estado de pagos
  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        total_participants: 0,
        paid_participants: 0,
        total_collected: 0,
        is_fully_paid: false,
      };
    }

    const participants = this.sessionParticipants.get(sessionId) || [];
    let paidCount = 0;

    for (const participant of participants) {
      const participantKey = `${sessionId}-${participant}`;
      if (this.participantPayments.get(participantKey)) {
        paidCount++;
      }
    }

    return {
      total_participants: session.participants_count,
      paid_participants: paidCount,
      total_collected: session.payments_received,
      is_fully_paid: paidCount === session.participants_count && session.participants_count > 0,
    };
  }

  // Obtener todos los participantes de una sesión
  async getSessionParticipants(sessionId: string): Promise<ParticipantPayment[]> {
    const participants = this.sessionParticipants.get(sessionId) || [];
    
    return participants.map(participant => {
      const participantKey = `${sessionId}-${participant}`;
      return {
        participant,
        amount: this.participantAmounts.get(participantKey) || 0,
        has_paid: this.participantPayments.get(participantKey) || false,
      };
    });
  }

  // Limpiar datos (para testing)
  clearAllData() {
    this.sessions.clear();
    this.participantAmounts.clear();
    this.participantPayments.clear();
    this.sessionParticipants.clear();
    console.log('🧹 [CONTRACT] All data cleared');
  }
}

// Exportar instancia singleton
export const contractService = new QRSplitContractService();

// Función helper para simular delay de transacción
export const simulateTransactionDelay = (ms: number = 2000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};