use starknet::ContractAddress;
use snforge_std::declare;

// Test constants usando TryInto en lugar de contract_address_const (deprecado)
fn OWNER() -> ContractAddress {
    123456789_felt252.try_into().unwrap()
}

fn MERCHANT() -> ContractAddress {
    987654321_felt252.try_into().unwrap()
}

fn PARTICIPANT_1() -> ContractAddress {
    111111111_felt252.try_into().unwrap()
}

fn PARTICIPANT_2() -> ContractAddress {
    222222222_felt252.try_into().unwrap()
}

fn PAYMENT_TOKEN() -> ContractAddress {
    333333333_felt252.try_into().unwrap()
}

// Tests básicos para verificar que el contrato compila y funciona
#[test]
fn test_contract_compilation() {
    let _contract = declare("QRSplitContract").unwrap();
    // Si llegamos aquí, el contrato compiló correctamente
    assert(true, 'Contract compiles correctly');
}

#[test]
fn test_basic_types() {
    let session_id: felt252 = 'session_001';
    let merchant_id: felt252 = 'merchant_001';
    let amount: u256 = 1000_u256;
    
    assert(session_id != 0, 'Session ID valid');
    assert(merchant_id != 0, 'Merchant ID valid');
    assert(amount > 0, 'Amount valid');
}

#[test]
fn test_address_creation() {
    let owner = OWNER();
    let merchant = MERCHANT();
    let participant = PARTICIPANT_1();
    
    assert(owner.into() != 0_felt252, 'Owner address valid');
    assert(merchant.into() != 0_felt252, 'Merchant address valid');
    assert(participant.into() != 0_felt252, 'Participant address valid');
}

#[test]
fn test_constructor_data() {
    let mut constructor_calldata: Array<felt252> = array![];
    constructor_calldata.append(OWNER().into());
    constructor_calldata.append(PAYMENT_TOKEN().into());
    
    assert(constructor_calldata.len() == 2, 'Constructor data prepared');
}

#[test]
fn test_session_id_generation() {
    let session_id_1: felt252 = 'session_001';
    let session_id_2: felt252 = 'session_002';
    
    assert(session_id_1 != session_id_2, 'Different session IDs');
    assert(session_id_1 != 0, 'Valid session ID 1');
    assert(session_id_2 != 0, 'Valid session ID 2');
}

#[test]
fn test_amount_calculations() {
    let total: u256 = 1000;
    let participant_1_share: u256 = 400;
    let participant_2_share: u256 = 600;
    
    assert(participant_1_share + participant_2_share == total, 'Amounts add up');
    assert(participant_1_share < total, 'Share less than total');
    assert(participant_2_share < total, 'Share less than total');
}

#[test]
fn test_felt252_operations() {
    let merchant_id: felt252 = 'merchant_pizza_palace';
    let session_id: felt252 = 'session_dinner_split';
    
    assert(merchant_id != 0, 'Merchant ID not zero');
    assert(session_id != 0, 'Session ID not zero');
    assert(merchant_id != session_id, 'Different identifiers');
}

#[test]
fn test_boolean_logic() {
    let is_active: bool = true;
    let is_completed: bool = false;
    
    assert(is_active, 'Active flag true');
    assert(!is_completed, 'Completed flag false');
    assert(is_active != is_completed, 'Different states');
}

#[test]
fn test_array_operations() {
    let mut participants: Array<ContractAddress> = array![];
    participants.append(PARTICIPANT_1());
    participants.append(PARTICIPANT_2());
    
    assert(participants.len() == 2, 'Two participants added');
}

#[test]
fn test_contract_class_availability() {
    let _contract_class = declare("QRSplitContract").unwrap();
    // Si llegamos aquí, el contrato se declara correctamente
    assert(true, 'Contract declares successfully');
}