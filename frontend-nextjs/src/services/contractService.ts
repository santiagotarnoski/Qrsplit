// src/services/contractService.ts

// Tipos que usa la UI (los mantengo)
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
  participant: string; // usaremos wallet o userId visible
  amount: number;
  has_paid: boolean;
}

// ======================
// Config & helpers HTTP
// ======================
const API_BASE =
  // Vite
  (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_URL) ||
  // Next.js
  process.env.NEXT_PUBLIC_API_URL ||
  // fallback local
  "http://localhost:3000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Tipos del backend (mínimos necesarios)
type DbSession = {
  sessionId: string;
  merchantId: string;
  totalAmount: number;
  participantsCount: number;
  createdAt: string;
  status: string; // 'active' | '...'
  participants: Array<{
    id: string;
    userId: string;
    name: string | null;
    walletAddress: string | null;
  }>;
  items: any[];
  payments?: Array<{
    id: string;
    sessionId: string;
    participantId: string | null;
    fromAddress: string;
    amount: number;
    status: string;
  }>;
};

type SplitsResponse = {
  success: boolean;
  splits: {
    method: string;
    totalAmount: number;
    participants: Array<{
      participantId: string;
      userId: string;
      name?: string | null;
      amount: number; // lo que debe ese participante
      items?: Array<{ id: string; name: string; amount: number; share: number }>;
    }>;
  };
};

export class QRSplitContractService {
  // =========================
  // createSession: crea en DB
  // =========================
  async createSession(
    sessionId: string,
    merchantId: string,
    merchantAddress: string, // no se usa en backend, lo dejamos por compatibilidad
    totalAmount: number      // el total real se forma con items; lo conservamos por compatibilidad
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // En el backend, el sessionId lo genera el server. Creamos y devolvemos el ID real.
      const r = await api<{
        success: true;
        session_id: string;
        session: DbSession;
      }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ merchant_id: merchantId }),
      });

      // Simulamos un txHash para la UI (el backend no devuelve uno real aquí)
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;

      return { success: true, txHash: mockTxHash };
    } catch (e: any) {
      return { success: false, error: e.message || "Create session failed" };
    }
  }

  // ==================================
  // joinSession: crea/une participante
  // ==================================
  async joinSession(
    sessionId: string,
    participantAddress: string,
    amountOwed: number // no lo usa el backend aquí; lo dejamos para la firma
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const wallet = (participantAddress || "").toLowerCase().trim();

      await api(`/api/sessions/${encodeURIComponent(sessionId)}/join`, {
        method: "POST",
        body: JSON.stringify({
          user_id: wallet,         // usamos la wallet como user_id para trazabilidad 1:1
          name: null,
          wallet_address: wallet,  // MUY IMPORTANTE: lowercase
        }),
      });

      const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
      return { success: true, txHash: mockTxHash };
    } catch (e: any) {
      return { success: false, error: e.message || "Join session failed" };
    }
  }

  // =========================================================
  // makePayment: llama al backend /pay (calcula amount si falta)
  // =========================================================
  async makePayment(
    sessionId: string,
    participantAddress: string,
    amountOverride?: number // opcional: si la UI ya sabe el monto
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const wallet = (participantAddress || "").toLowerCase().trim();

      // 1) Traer la sesión para encontrar el participant.id
      const session = await api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
      const participant = session.participants.find(
        (p) => (p.walletAddress || "").toLowerCase() === wallet
      );

      if (!participant) {
        return { success: false, error: "Participant not found (wallet no registrada en la sesión)" };
      }

      // 2) Calcular amount si no viene
      let amount = amountOverride ?? 0;
      if (amount === 0) {
        const splits = await api<SplitsResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/splits`);
        const mine = splits.splits.participants.find((sp) => sp.participantId === participant.id);
        amount = mine?.amount ?? 0;
      }

      if (!amount || amount <= 0) {
        return { success: false, error: "Monto a pagar no determinado" };
      }

      // 3) Pagar
      const payRes = await api<{
        success: boolean;
        txHash: string;
      }>(`/api/sessions/${encodeURIComponent(sessionId)}/pay`, {
        method: "POST",
        body: JSON.stringify({
          user_id: participant.userId,
          wallet_address: wallet,
          amount,
          // to_address y token_address pueden omitirse: el backend tiene defaults
        }),
      });

      return { success: true, txHash: payRes.txHash };
    } catch (e: any) {
      return { success: false, error: e.message || "Payment failed" };
    }
  }

  // ===========================================
  // executeGroupPayment: (no hay endpoint aún)
  // ===========================================
  async executeGroupPayment(
    _sessionId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    // Si más adelante creás el endpoint, cambiamos esto.
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 18)}`;
    return { success: true, txHash: mockTxHash };
  }

  // ===============
  // Lecturas (read)
  // ===============
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      const s = await api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
      // Mapear al tipo que espera la UI
      const info: SessionInfo = {
        session_id: s.sessionId,
        merchant: "", // no lo tenemos en la fila; podrías guardar merchant wallet en Session si querés
        merchant_id: s.merchantId,
        total_amount: s.totalAmount,
        participants_count: s.participantsCount,
        payments_received: (s.payments || [])
          .filter((p) => p.status === "success")
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        created_at: Math.floor(new Date(s.createdAt).getTime() / 1000),
        is_active: s.status === "active",
        is_completed: s.status === "completed",
      };
      return info;
    } catch {
      return null;
    }
  }

  async getParticipantAmount(sessionId: string, participantAddress: string): Promise<number> {
    try {
      const wallet = (participantAddress || "").toLowerCase().trim();
      const session = await api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
      const participant = session.participants.find(
        (p) => (p.walletAddress || "").toLowerCase() === wallet
      );
      if (!participant) return 0;

      const splits = await api<SplitsResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/splits`);
      const mine = splits.splits.participants.find((sp) => sp.participantId === participant.id);
      return mine?.amount ?? 0;
    } catch {
      return 0;
    }
  }

  async hasParticipantPaid(sessionId: string, participantAddress: string): Promise<boolean> {
    try {
      const wallet = (participantAddress || "").toLowerCase().trim();
      const s = await api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
      return (s.payments || []).some(
        (p) => p.status === "success" && (p.fromAddress || "").toLowerCase() === wallet
      );
    } catch {
      return false;
    }
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    try {
      const s = await api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
      const total_participants = s.participantsCount;
      const successPayments = (s.payments || []).filter((p) => p.status === "success");
      const total_collected = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // cantidad de participantes que pagaron (distintos participantId)
      const paid_participants = new Set(
        successPayments.map((p) => p.participantId).filter(Boolean) as string[]
      ).size;

      return {
        total_participants,
        paid_participants,
        total_collected,
        is_fully_paid: total_participants > 0 && paid_participants === total_participants,
      };
    } catch {
      return {
        total_participants: 0,
        paid_participants: 0,
        total_collected: 0,
        is_fully_paid: false,
      };
    }
  }

  async getSessionParticipants(sessionId: string): Promise<ParticipantPayment[]> {
    try {
      const [s, splits] = await Promise.all([
        api<DbSession>(`/api/sessions/${encodeURIComponent(sessionId)}`),
        api<SplitsResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/splits`),
      ]);

      const paidSet = new Set(
        (s.payments || [])
          .filter((p) => p.status === "success")
          .map((p) => p.participantId)
          .filter(Boolean) as string[]
      );

      return s.participants.map((p) => {
        const match = splits.splits.participants.find((sp) => sp.participantId === p.id);
        return {
          participant: p.walletAddress || p.userId,
          amount: match?.amount ?? 0,
          has_paid: paidSet.has(p.id),
        };
      });
    } catch {
      return [];
    }
  }

  // Para mantener compatibilidad con la UI existente
  clearAllData() {
    // No-op: ahora los datos viven en el backend
    console.log("ℹ️ [CONTRACT] clearAllData(): no-op en modo backend");
  }
}

// Exportar instancia
export const contractService = new QRSplitContractService();

// Utilidad: simular delay (la UI la usa para UX)
export const simulateTransactionDelay = (ms: number = 2000): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
