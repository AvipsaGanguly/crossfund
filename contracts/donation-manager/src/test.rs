#![cfg(test)]

//! Unit tests for DonationManager in isolation.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};

fn setup_dm_only() -> (Env, DonationManagerClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000_000);

    // Mock token
    let token_admin = Address::generate(&env);
    let token_addr = env.register_stellar_asset_contract(token_admin.clone());

    // Use a plain generated address as the mock CampaignManager
    let mock_cm = Address::generate(&env);

    let dm_id = env.register_contract(None, DonationManager);
    let dm = DonationManagerClient::new(&env, &dm_id);
    dm.init(&mock_cm, &token_addr);

    (env, dm, token_addr, mock_cm)
}

#[test]
fn test_get_campaign_funds_unregistered_returns_zero() {
    let (_, dm, _, _) = setup_dm_only();
    assert_eq!(dm.get_campaign_funds(&999u64), 0i128);
}

#[test]
fn test_register_campaign_initializes_zero_funds() {
    let (_, dm, _, _) = setup_dm_only();
    dm.register_campaign(&42u64);
    assert_eq!(dm.get_campaign_funds(&42u64), 0i128);
}

#[test]
fn test_token_balance_sanity() {
    let (env, _, token_addr, _) = setup_dm_only();
    let token = StellarAssetClient::new(&env, &token_addr);
    let user = Address::generate(&env);

    token.mint(&user, &1_000i128);
    let client = soroban_sdk::token::Client::new(&env, &token_addr);
    assert_eq!(client.balance(&user), 1_000i128);
}

#[test]
fn test_donate_with_custom_asset() {
    let (env, dm, token_addr, _) = setup_dm_only();
    dm.register_campaign(&1u64);

    // Create a second custom asset contract (e.g. USDC / SRT)
    let custom_admin = Address::generate(&env);
    let custom_token_addr = env.register_stellar_asset_contract(custom_admin);
    let custom_token = StellarAssetClient::new(&env, &custom_token_addr);

    let donor = Address::generate(&env);
    custom_token.mint(&donor, &500i128);

    dm.donate_with_asset(&donor, &1u64, &custom_token_addr, &200i128);
    assert_eq!(dm.get_campaign_funds(&1u64), 200i128);
    assert_eq!(dm.get_campaign_asset_funds(&1u64, &custom_token_addr), 200i128);
    assert_eq!(dm.get_campaign_asset_funds(&1u64, &token_addr), 0i128);
}

#[test]
fn test_record_and_confirm_pending_donation() {
    let (env, dm, token_addr, _) = setup_dm_only();
    dm.register_campaign(&1u64);

    let donor = Address::generate(&env);
    let token = StellarAssetClient::new(&env, &token_addr);
    token.mint(&donor, &1_000i128);

    let deposit_id = soroban_sdk::String::from_str(&env, "anchor_dep_98765");

    // 1. Record pending donation
    dm.record_pending_donation(&donor, &1u64, &deposit_id, &300i128, &token_addr);
    assert_eq!(dm.get_pending_funds(&1u64), 300i128);

    let pending = dm.get_pending_donation(&deposit_id);
    assert_eq!(pending.amount, 300i128);
    assert_eq!(pending.status, DonationStatus::Pending);

    // 2. Confirm pending donation
    dm.confirm_pending_donation(&deposit_id);
    assert_eq!(dm.get_campaign_funds(&1u64), 300i128);
    assert_eq!(dm.get_pending_funds(&1u64), 0i128);

    let confirmed = dm.get_pending_donation(&deposit_id);
    assert_eq!(confirmed.status, DonationStatus::Confirmed);
}

#[test]
fn test_idempotency_prevents_double_crediting() {
    let (env, dm, token_addr, _) = setup_dm_only();
    dm.register_campaign(&1u64);

    let donor = Address::generate(&env);
    let token = StellarAssetClient::new(&env, &token_addr);
    token.mint(&donor, &1_000i128);

    let deposit_id = soroban_sdk::String::from_str(&env, "tx_dep_12345");

    dm.record_pending_donation(&donor, &1u64, &deposit_id, &300i128, &token_addr);
    dm.confirm_pending_donation(&deposit_id);

    // Attempting to confirm the exact same deposit_id again MUST fail with Error
    let res = dm.try_confirm_pending_donation(&deposit_id);
    assert!(res.is_err());
}

#[test]
fn test_donate_with_path_payment_auto_converts() {
    let (env, dm, _token_addr, _) = setup_dm_only();
    dm.register_campaign(&1u64);

    // Create source asset (Token A) and destination campaign asset (Token B)
    let admin_a = Address::generate(&env);
    let token_a_addr = env.register_stellar_asset_contract(admin_a);
    let token_a = StellarAssetClient::new(&env, &token_a_addr);

    let admin_b = Address::generate(&env);
    let token_b_addr = env.register_stellar_asset_contract(admin_b);

    let donor = Address::generate(&env);
    token_a.mint(&donor, &1_000i128);

    // Rate: 1 Token A = 0.95 Token B (num = 95, den = 100)
    // Donating 1000 Token A -> converts to 950 Token B
    dm.donate_with_path_payment(
        &donor,
        &1u64,
        &token_a_addr,
        &1_000i128,
        &token_b_addr,
        &900i128,  // min_dest_amount (slippage threshold)
        &95i128,   // rate num
        &100i128,  // rate den
    );

    assert_eq!(dm.get_campaign_funds(&1u64), 950i128);
    assert_eq!(dm.get_campaign_asset_funds(&1u64, &token_b_addr), 950i128);
}

#[test]
fn test_donate_with_path_payment_slippage_exceeded() {
    let (env, dm, _, _) = setup_dm_only();
    dm.register_campaign(&1u64);

    let admin_a = Address::generate(&env);
    let token_a_addr = env.register_stellar_asset_contract(admin_a);
    let token_a = StellarAssetClient::new(&env, &token_a_addr);

    let admin_b = Address::generate(&env);
    let token_b_addr = env.register_stellar_asset_contract(admin_b);

    let donor = Address::generate(&env);
    token_a.mint(&donor, &1_000i128);

    // Rate: 1 Token A = 0.80 Token B -> 1000 Token A converts to 800 Token B
    // But donor sets min_dest_amount = 900 -> MUST fail with SlippageExceeded error
    let res = dm.try_donate_with_path_payment(
        &donor,
        &1u64,
        &token_a_addr,
        &1_000i128,
        &token_b_addr,
        &900i128,  // min_dest_amount higher than 800
        &80i128,
        &100i128,
    );

    assert!(res.is_err());
}
