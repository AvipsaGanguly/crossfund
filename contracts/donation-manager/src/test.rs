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
