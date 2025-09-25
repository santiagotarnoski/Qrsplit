use starknet::{ContractAddress, contract_address_const};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};
use qrsplit_contracts::QRSplitContract::{IQRSplitContractDispatcher, IQRSplitContractDispatcherTrait};

// Test constants
fn OWNER() -> ContractAddress {
    contract_address_const::<'owner'>()
}

fn MERCHANT() -> ContractAddress {
    contract_address_const::<'merchant'>()
}

fn PARTICIPANT_1() -> ContractAddress {
    contract_address_const::<'participant1'>()
}

fn PARTICIPANT_2() -> ContractAddress {
    contract_address_const::<'participant2'>()
}

fn PAYMENT_TOKEN() -> ContractAddress {
    contract_address_const::<'strk_token'>()
}

fn setup() -> IQRSplitContractDispatcher {
    let contract = declare("QRSplitContract").unwrap();
    
    let mut constructor_calldata = array![];
    constructor_calldata.append(OWNER().into());
    constructor_calldata.append(PAYMENT_TOKEN().into());
    
    let contract_address = contract.deploy(@constructor_calldata).unwrap();
    IQRSplitContractDispatcher { contract_address }
}

#[test]
fn test_create_session() {
    let contract = setup();
    
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    
    let result = contract.create_session(session_id, merchant_id, total_amount);
    assert(result, 'Session creation failed');
    
    let session = contract.get_session(session_id);
    assert(session.session_id == session_id, 'Wrong session ID');
    assert(session.merchant == MERCHANT(), 'Wrong merchant');
    assert(session.total_amount == total_amount, 'Wrong total amount');
    assert(session.is_active, 'Session should be active');
    assert(!session.is_completed, 'Session should not be completed');
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_join_session() {
    let contract = setup();
    
    // Create session as merchant
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    contract.create_session(session_id, merchant_id, total_amount);
    stop_cheat_caller_address(contract.contract_address);
    
    // Join session as participant
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    let amount_owed = 500_u256;
    let result = contract.join_session(session_id, PARTICIPANT_1(), amount_owed);
    assert(result, 'Join session failed');
    
    let participant_amount = contract.get_participant_amount(session_id, PARTICIPANT_1());
    assert(participant_amount == amount_owed, 'Wrong participant amount');
    
    let session = contract.get_session(session_id);
    assert(session.participants_count == 1, 'Wrong participant count');
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_make_payment() {
    let contract = setup();
    
    // Setup session
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    contract.create_session(session_id, merchant_id, total_amount);
    stop_cheat_caller_address(contract.contract_address);
    
    // Join session
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    let amount_owed = 500_u256;
    contract.join_session(session_id, PARTICIPANT_1(), amount_owed);
    
    // Make payment
    let result = contract.make_payment(session_id);
    assert(result, 'Payment failed');
    
    let has_paid = contract.has_participant_paid(session_id, PARTICIPANT_1());
    assert(has_paid, 'Payment not recorded');
    
    let session = contract.get_session(session_id);
    assert(session.payments_received == amount_owed, 'Wrong payments received');
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_payment_status() {
    let contract = setup();
    
    // Setup session
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    contract.create_session(session_id, merchant_id, total_amount);
    stop_cheat_caller_address(contract.contract_address);
    
    // Add two participants
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    contract.join_session(session_id, PARTICIPANT_1(), 500_u256);
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_2());
    contract.join_session(session_id, PARTICIPANT_2(), 500_u256);
    stop_cheat_caller_address(contract.contract_address);
    
    // Check initial status
    let status = contract.get_payment_status(session_id);
    assert(status.total_participants == 2, 'Wrong total participants');
    assert(status.paid_participants == 0, 'Wrong paid participants');
    assert(!status.is_fully_paid, 'Should not be fully paid');
    
    // First participant pays
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    contract.make_payment(session_id);
    stop_cheat_caller_address(contract.contract_address);
    
    let status = contract.get_payment_status(session_id);
    assert(status.paid_participants == 1, 'Wrong paid participants after first payment');
    assert(!status.is_fully_paid, 'Should not be fully paid yet');
    
    // Second participant pays
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_2());
    contract.make_payment(session_id);
    stop_cheat_caller_address(contract.contract_address);
    
    let status = contract.get_payment_status(session_id);
    assert(status.paid_participants == 2, 'Wrong paid participants after all payments');
    assert(status.is_fully_paid, 'Should be fully paid');
}

#[test]
fn test_execute_group_payment() {
    let contract = setup();
    
    // Setup complete session with payments
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    contract.create_session(session_id, merchant_id, total_amount);
    stop_cheat_caller_address(contract.contract_address);
    
    // Add participants and make payments
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    contract.join_session(session_id, PARTICIPANT_1(), 500_u256);
    contract.make_payment(session_id);
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_2());
    contract.join_session(session_id, PARTICIPANT_2(), 500_u256);
    contract.make_payment(session_id);
    stop_cheat_caller_address(contract.contract_address);
    
    // Execute group payment
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let result = contract.execute_group_payment(session_id);
    assert(result, 'Group payment execution failed');
    
    let session = contract.get_session(session_id);
    assert(!session.is_active, 'Session should not be active');
    assert(session.is_completed, 'Session should be completed');
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: 'Session already exists')]
fn test_create_duplicate_session() {
    let contract = setup();
    
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    
    let session_id = 'session_001';
    let merchant_id = 'merchant_001';
    let total_amount = 1000_u256;
    
    contract.create_session(session_id, merchant_id, total_amount);
    contract.create_session(session_id, merchant_id, total_amount); // Should panic
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: 'Participant already paid')]
fn test_double_payment() {
    let contract = setup();
    
    // Setup
    start_cheat_caller_address(contract.contract_address, MERCHANT());
    let session_id = 'session_001';
    contract.create_session(session_id, 'merchant_001', 1000_u256);
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, PARTICIPANT_1());
    contract.join_session(session_id, PARTICIPANT_1(), 500_u256);
    contract.make_payment(session_id);
    contract.make_payment(session_id); // Should panic
    
    stop_cheat_caller_address(contract.contract_address);
}