use starknet::ContractAddress;

#[starknet::interface]
trait IPaymentSplit<TContractState> {
    fn create_session(
        ref self: TContractState,
        session_id: felt252,
        total_amount: u256
    ) -> bool;
    
    fn contribute_payment(
        ref self: TContractState,
        session_id: felt252,
        participant: ContractAddress
    ) -> bool;
    
    fn get_session_total(self: @TContractState, session_id: felt252) -> u256;
}

#[starknet::contract]
mod PaymentSplit {
    use super::{IPaymentSplit, ContractAddress};
    use starknet::get_caller_address;

    #[storage]
    struct Storage {
        session_totals: LegacyMap<felt252, u256>,
        session_merchants: LegacyMap<felt252, ContractAddress>,
        participant_payments: LegacyMap<(felt252, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionCreated: SessionCreated,
        PaymentMade: PaymentMade,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionCreated {
        session_id: felt252,
        merchant: ContractAddress,
        total_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentMade {
        session_id: felt252,
        participant: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        // Constructor simple
    }

    #[abi(embed_v0)]
    impl PaymentSplitImpl of IPaymentSplit<ContractState> {
        fn create_session(
            ref self: ContractState,
            session_id: felt252,
            total_amount: u256
        ) -> bool {
            let merchant = get_caller_address();
            
            self.session_totals.write(session_id, total_amount);
            self.session_merchants.write(session_id, merchant);
            
            self.emit(SessionCreated {
                session_id,
                merchant,
                total_amount,
            });
            
            true
        }

        fn contribute_payment(
            ref self: ContractState,
            session_id: felt252,
            participant: ContractAddress
        ) -> bool {
            let total = self.session_totals.read(session_id);
            assert(total > 0, 'Session does not exist');
            
            self.participant_payments.write((session_id, participant), true);
            
            self.emit(PaymentMade {
                session_id,
                participant,
            });
            
            true
        }

        fn get_session_total(self: @ContractState, session_id: felt252) -> u256 {
            self.session_totals.read(session_id)
        }
    }
}