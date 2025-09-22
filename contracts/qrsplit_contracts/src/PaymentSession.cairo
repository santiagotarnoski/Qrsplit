use starknet::ContractAddress;

#[starknet::interface]
trait IPaymentSession<TContractState> {
    fn create_session(ref self: TContractState, merchant_id: felt252, session_id: felt252) -> felt252;
    fn get_session_total(self: @TContractState, session_id: felt252) -> u256;
    fn add_item(ref self: TContractState, session_id: felt252, amount: u256);
    fn close_session(ref self: TContractState, session_id: felt252);
}

#[derive(Drop, Serde, starknet::Store)]
struct Session {
    id: felt252,
    merchant_id: felt252,
    merchant_address: ContractAddress,
    total_amount: u256,
    created_at: u64,
    is_open: bool,
}

#[starknet::contract]
mod PaymentSession {
    use super::{IPaymentSession, Session};
    use starknet::{
        ContractAddress, get_caller_address, get_block_timestamp,
        storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map},
    };

    #[storage]
    struct Storage {
        sessions: Map<felt252, Session>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionCreated: SessionCreated,
        ItemAdded: ItemAdded,
        SessionClosed: SessionClosed,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionCreated { session_id: felt252, merchant_id: felt252 }
    #[derive(Drop, starknet::Event)]
    struct ItemAdded { session_id: felt252, amount: u256 }
    #[derive(Drop, starknet::Event)]
    struct SessionClosed { session_id: felt252, total: u256 }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl PaymentSessionImpl of IPaymentSession<ContractState> {
        fn create_session(ref self: ContractState, merchant_id: felt252, session_id: felt252) -> felt252 {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'NOT_OWNER');
            assert(merchant_id != 0, 'INVALID_MERCHANT');

            // prevenir sobrescritura
            let maybe_existing = self.sessions.read(session_id);
            assert(maybe_existing.id == 0, 'SESSION_EXISTS');


            let session = Session {
                id: session_id,
                merchant_id,
                merchant_address: caller,
                total_amount: 0,
                created_at: get_block_timestamp(),
                is_open: true,
            };
            self.sessions.write(session_id, session);
            self.emit(SessionCreated { session_id, merchant_id });
            session_id
        }

        fn add_item(ref self: ContractState, session_id: felt252, amount: u256) {
            let old_session = self.sessions.read(session_id);
            assert(old_session.is_open, 'SESSION_CLOSED');
            assert(amount > 0, 'AMOUNT_ZERO');

            let updated_session = Session {
                total_amount: old_session.total_amount + amount,
                ..old_session
            };
            self.sessions.write(session_id, updated_session);
            self.emit(ItemAdded { session_id, amount });
        }

        fn get_session_total(self: @ContractState, session_id: felt252) -> u256 {
            let session = self.sessions.read(session_id);
            assert(session.is_open || session.total_amount > 0, 'SESSION_NOT_FOUND');
            session.total_amount
        }

        fn close_session(ref self: ContractState, session_id: felt252) {
            let old_session = self.sessions.read(session_id);
            assert(old_session.is_open, 'ALREADY_CLOSED');

            let updated_session = Session {
                is_open: false,
                ..old_session
            };
            let total_before = updated_session.total_amount;
            self.sessions.write(session_id, updated_session);
            self.emit(SessionClosed { session_id, total: total_before });
        }
    }
}
