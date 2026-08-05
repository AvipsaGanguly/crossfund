#![cfg(test)]

//! Unit tests for DonationManager in isolation.
//!
//! The cross-contract integration test (create_campaign → register_campaign)
//! lives in campaign-manager/src/test.rs where donation-manager is a plain
//! dev-dependency. This avoids the stellar-xdr/arbitrary version conflict
//! that occurs when testutils features are transitively propagated.

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

// ─────────────────────────────────────────────────────────────────────────────
// Test: get_campaign_funds returns 0 for unregistered campaign
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_get_campaign_funds_unregistered_returns_zero() {
    let (_, dm, _, _) = setup_dm_only();
    assert_eq!(dm.get_campaign_funds(&999u64), 0i128);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: register_campaign (mocked auth) sets funds to 0
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_register_campaign_initializes_zero_funds() {
    let (_, dm, _, _) = setup_dm_only();
    // mock_all_auths satisfies cm.require_auth() inside register_campaign
    dm.register_campaign(&42u64);
    assert_eq!(dm.get_campaign_funds(&42u64), 0i128);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: token balance accounting works (basic sanity)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_token_balance_sanity() {
    let (env, _, token_addr, _) = setup_dm_only();
    let _token_admin = Address::generate(&env);
    let token = StellarAssetClient::new(&env, &token_addr);
    let user = Address::generate(&env);

    token.mint(&user, &1_000i128);
    let client = soroban_sdk::token::Client::new(&env, &token_addr);
    assert_eq!(client.balance(&user), 1_000i128);
}
