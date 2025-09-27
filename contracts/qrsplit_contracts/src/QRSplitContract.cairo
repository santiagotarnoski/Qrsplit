use starknet::ContractAddress;

#[starknet::interface]
trait IQRSplitContract<TContractState> {
    // Crear nueva sesión de pago grupal
    fn create_session(
        ref self: TContractState,
        session_id: felt252,
        merchant_id: felt252,
        total_amount: u256
    ) -> bool;
    
    // Agregar participante a sesión
    fn join_session(
        ref self: TContractState,
        session_id: felt252,
        participant: ContractAddress,
        amount_owed: u256
    ) -> bool;
    
    // Realizar pago individual
    fn make_payment(
        ref self: TContractState,
        session_id: felt252
    ) -> bool;
    
    // Ejecutar pago grupal atómico
    fn execute_group_payment(
        ref self: TContractState,
        session_id: felt252
    ) -> bool;
    
    // Obtener información de sesión
    fn get_session(self: @TContractState, session_id: felt252) -> SessionInfo;
    
    // Obtener cantidad adeudada por participante
    fn get_participant_amount(
        self: @TContractState,
        session_id: felt252,
        participant: ContractAddress
    ) -> u256;
    
    // Verificar si participante ya pagó
    fn has_participant_paid(
        self: @TContractState,
        session_id: felt252,
        participant: ContractAddress
    ) -> bool;
    
    // Obtener estado de pagos de sesión
    fn get_payment_status(self: @TContractState, session_id: felt252) -> PaymentStatus;
}

// Estructuras de datos
#[derive(Drop, Serde, starknet::Store, Clone)]
pub struct SessionInfo {
    pub session_id: felt252,
    pub merchant: ContractAddress,
    pub merchant_id: felt252,
    pub total_amount: u256,
    pub participants_count: u32,
    pub payments_received: u256,
    pub created_at: u64,
    pub is_active: bool,
    pub is_completed: bool
}

#[derive(Drop, Serde)]
pub struct PaymentStatus {
    pub total_participants: u32,
    pub paid_participants: u32,
    pub total_collected: u256,
    pub is_fully_paid: bool
}

#[starknet::contract]
mod QRSplitContract {
    use super::{IQRSplitContract, SessionInfo, PaymentStatus};
    use starknet::{
        ContractAddress, get_caller_address, get_block_timestamp,
        storage::{
            StoragePointerWriteAccess,
            StorageMapReadAccess, StorageMapWriteAccess, Map
        }
    };

    #[storage]
    struct Storage {
        // Información de sesiones
        sessions: Map<felt252, SessionInfo>,
        
        // Cantidad adeudada por cada participante en cada sesión
        participant_amounts: Map<(felt252, ContractAddress), u256>,
        
        // Pagos realizados por participantes
        participant_payments: Map<(felt252, ContractAddress), bool>,
        
        // Lista de participantes por sesión
        session_participants: Map<(felt252, u32), ContractAddress>,
        session_participant_count: Map<felt252, u32>,
        
        // Owner del contrato
        owner: ContractAddress,
        
        // Token ERC20 para pagos (STRK por defecto)
        payment_token: ContractAddress
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionCreated: SessionCreated,
        ParticipantJoined: ParticipantJoined,
        PaymentMade: PaymentMade,
        GroupPaymentExecuted: GroupPaymentExecuted,
        SessionCompleted: SessionCompleted
    }

    #[derive(Drop, starknet::Event)]
    struct SessionCreated {
        session_id: felt252,
        merchant: ContractAddress,
        merchant_id: felt252,
        total_amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct ParticipantJoined {
        session_id: felt252,
        participant: ContractAddress,
        amount_owed: u256
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentMade {
        session_id: felt252,
        participant: ContractAddress,
        amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct GroupPaymentExecuted {
        session_id: felt252,
        total_amount: u256,
        participants_count: u32
    }

    #[derive(Drop, starknet::Event)]
    struct SessionCompleted {
        session_id: felt252,
        merchant: ContractAddress,
        total_paid: u256
    }

    // Errores personalizados - definidos directamente como constantes
    const SESSION_EXISTS: felt252 = 'Session already exists';
    const SESSION_NOT_FOUND: felt252 = 'Session not found';
    const SESSION_INACTIVE: felt252 = 'Session is not active';
    const PARTICIPANT_EXISTS: felt252 = 'Participant already exists';
    const PARTICIPANT_NOT_FOUND: felt252 = 'Participant not found';
    const ALREADY_PAID: felt252 = 'Participant already paid';
    const INSUFFICIENT_PAYMENT: felt252 = 'Insufficient payment amount';
    const NOT_ALL_PAID: felt252 = 'Not all participants paid';
    const UNAUTHORIZED: felt252 = 'Unauthorized caller';
    const INVALID_AMOUNT: felt252 = 'Invalid amount';

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, payment_token: ContractAddress) {
        self.owner.write(owner);
        self.payment_token.write(payment_token);
    }

    #[abi(embed_v0)]
    impl QRSplitContractImpl of IQRSplitContract<ContractState> {
        fn create_session(
            ref self: ContractState,
            session_id: felt252,
            merchant_id: felt252,
            total_amount: u256
        ) -> bool {
            let caller = get_caller_address();
            
            // Verificar que la sesión no exista
            let existing_session = self.sessions.read(session_id);
            assert(existing_session.session_id == 0, SESSION_EXISTS);
            
            // Validar parámetros
            assert(session_id != 0, 'Invalid session ID');
            assert(merchant_id != 0, 'Invalid merchant ID');
            assert(total_amount > 0, INVALID_AMOUNT);
            
            // Crear sesión
            let session = SessionInfo {
                session_id,
                merchant: caller,
                merchant_id,
                total_amount,
                participants_count: 0,
                payments_received: 0,
                created_at: get_block_timestamp(),
                is_active: true,
                is_completed: false
            };
            
            self.sessions.write(session_id, session);
            
            self.emit(SessionCreated {
                session_id,
                merchant: caller,
                merchant_id,
                total_amount
            });
            
            true
        }

        fn join_session(
            ref self: ContractState,
            session_id: felt252,
            participant: ContractAddress,
            amount_owed: u256
        ) -> bool {
            let mut session = self.sessions.read(session_id);
            assert(session.session_id != 0, SESSION_NOT_FOUND);
            assert(session.is_active, SESSION_INACTIVE);
            
            // Verificar que el participante no exista ya
            let existing_amount = self.participant_amounts.read((session_id, participant));
            assert(existing_amount == 0, PARTICIPANT_EXISTS);
            
            assert(amount_owed > 0, INVALID_AMOUNT);
            
            // Agregar participante
            self.participant_amounts.write((session_id, participant), amount_owed);
            
            // Actualizar lista de participantes
            let current_count = session.participants_count;
            self.session_participants.write((session_id, current_count), participant);
            
            // Actualizar sesión
            session.participants_count += 1;
            let participants_count = session.participants_count; // Clonar antes de mover
            self.sessions.write(session_id, session);
            self.session_participant_count.write(session_id, participants_count);
            
            self.emit(ParticipantJoined {
                session_id,
                participant,
                amount_owed
            });
            
            true
        }

        fn make_payment(ref self: ContractState, session_id: felt252) -> bool {
            let caller = get_caller_address();
            let session = self.sessions.read(session_id);
            assert(session.session_id != 0, SESSION_NOT_FOUND);
            assert(session.is_active, SESSION_INACTIVE);
            
            // Verificar que el participante existe
            let amount_owed = self.participant_amounts.read((session_id, caller));
            assert(amount_owed > 0, PARTICIPANT_NOT_FOUND);
            
            // Verificar que no haya pagado ya
            let has_paid = self.participant_payments.read((session_id, caller));
            assert(!has_paid, ALREADY_PAID);
            
            // Marcar como pagado
            self.participant_payments.write((session_id, caller), true);
            
            // Actualizar pagos recibidos
            let mut updated_session = session;
            updated_session.payments_received += amount_owed;
            self.sessions.write(session_id, updated_session);
            
            self.emit(PaymentMade {
                session_id,
                participant: caller,
                amount: amount_owed
            });
            
            true
        }

        fn execute_group_payment(ref self: ContractState, session_id: felt252) -> bool {
            let mut session = self.sessions.read(session_id);
            assert(session.session_id != 0, SESSION_NOT_FOUND);
            assert(session.is_active, SESSION_INACTIVE);
            
            // Verificar que todos hayan pagado
            let payment_status = self.get_payment_status(session_id);
            assert(payment_status.is_fully_paid, NOT_ALL_PAID);
            
            // Transferir fondos al merchant
            // En un entorno real, aquí haríamos la transferencia de tokens
            // Por ahora, solo marcamos como completado
            
            // Clonar valores antes de mover la sesión
            let total_amount = session.total_amount;
            let participants_count = session.participants_count;
            let merchant = session.merchant;
            let payments_received = session.payments_received;
            
            session.is_active = false;
            session.is_completed = true;
            self.sessions.write(session_id, session);
            
            self.emit(GroupPaymentExecuted {
                session_id,
                total_amount,
                participants_count
            });
            
            self.emit(SessionCompleted {
                session_id,
                merchant,
                total_paid: payments_received
            });
            
            true
        }

        fn get_session(self: @ContractState, session_id: felt252) -> SessionInfo {
            self.sessions.read(session_id)
        }

        fn get_participant_amount(
            self: @ContractState,
            session_id: felt252,
            participant: ContractAddress
        ) -> u256 {
            self.participant_amounts.read((session_id, participant))
        }

        fn has_participant_paid(
            self: @ContractState,
            session_id: felt252,
            participant: ContractAddress
        ) -> bool {
            self.participant_payments.read((session_id, participant))
        }

        fn get_payment_status(self: @ContractState, session_id: felt252) -> PaymentStatus {
            let session = self.sessions.read(session_id);
            
            if session.session_id == 0 {
                return PaymentStatus {
                    total_participants: 0,
                    paid_participants: 0,
                    total_collected: 0,
                    is_fully_paid: false
                };
            }
            
            let mut paid_count = 0;
            let mut i = 0;
            
            while i < session.participants_count {
                let participant = self.session_participants.read((session_id, i));
                let has_paid = self.participant_payments.read((session_id, participant));
                if has_paid {
                    paid_count += 1;
                }
                i += 1;
            };
            
            PaymentStatus {
                total_participants: session.participants_count,
                paid_participants: paid_count,
                total_collected: session.payments_received,
                is_fully_paid: paid_count == session.participants_count
            }
        }
    }
}