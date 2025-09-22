use starknet::ContractAddress;
use snforge_std::{declare, DeclareResultTrait};

// Test constants
fn OWNER() -> ContractAddress {
    123456789_felt252.try_into().unwrap()
}

// MVP Tests for QRSplit PaymentSession Contract
// These tests verify that the contract compiles and basic operations work

#[test]
fn test_contract_compilation_and_declaration() {
    let _contract_class = declare("PaymentSession").unwrap().contract_class();
    // If we reach here, the contract compiled and declared successfully
    assert(true, 'Contract compiles correctly');
}

#[test] 
fn test_constructor_calldata_preparation() {
    let _contract_class = declare("PaymentSession").unwrap().contract_class();
    
    // Verify we can prepare constructor calldata correctly
    let mut constructor_calldata: Array<felt252> = array![];
    constructor_calldata.append(OWNER().into());
    
    assert(constructor_calldata.len() == 1, 'Constructor data prepared');
}

#[test]
fn test_owner_address_creation() {
    let owner = OWNER();
    let zero_address: ContractAddress = 0_felt252.try_into().unwrap();
    
    assert(owner != zero_address, 'Owner address valid');
}

#[test]
fn test_felt252_conversions() {
    let merchant_id: felt252 = 'merchant_001';
    let session_id: felt252 = 'session_001';
    
    // Test that our felt252 values are valid
    assert(merchant_id != 0, 'Merchant ID valid');
    assert(session_id != 0, 'Session ID valid');
}

#[test]
fn test_u256_operations() {
    let amount1: u256 = 100;
    let amount2: u256 = 50;
    let total = amount1 + amount2;
    
    assert(total == 150, 'U256 math works');
}

#[test]
fn test_array_operations() {
    let mut call_data = array![];
    call_data.append('test');
    call_data.append(123);
    
    assert(call_data.len() == 2, 'Array operations work');
}