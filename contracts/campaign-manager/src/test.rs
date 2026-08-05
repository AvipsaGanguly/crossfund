#![cfg(test)]

//! Integration tests for CampaignManager.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

use donation_manager::{DonationManager, DonationManagerClient};

struct TestFixture {
    env: Env,
    cm: CampaignManagerClient<'static>,
    dm: DonationManagerClient<'static>,
}

fn setup() -> TestFixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000_000);

    let token_addr = Address::generate(&env);

    let cm_id = env.register_contract(None, CampaignManager);
    let cm = CampaignManagerClient::new(&env, &cm_id);

    let dm_id = env.register_contract(None, DonationManager);
    let dm = DonationManagerClient::new(&env, &dm_id);

    cm.init(&dm_id);
    dm.init(&cm_id, &token_addr);

    TestFixture { env, cm, dm }
}

#[test]
fn test_create_campaign_invokes_register_campaign() {
    let f = setup();
    let owner = Address::generate(&f.env);

    let campaign_id = f.cm.create_campaign(
        &owner,
        &soroban_sdk::String::from_str(&f.env, "Save the Rainforest"),
        &soroban_sdk::String::from_str(&f.env, "Plant 1M trees"),
        &500_000_000i128, // goal: 50 XLM in stroops
        &2_000_000u64,    // deadline > 1_000_000
        &soroban_sdk::String::from_str(&f.env, "Environment"),
    );

    assert_eq!(campaign_id, 1u64, "First campaign must have ID 1");

    let funds = f.dm.get_campaign_funds(&campaign_id);
    assert_eq!(funds, 0i128, "Newly registered campaign must have 0 raised");

    let meta = f.cm.get_campaign(&campaign_id);
    assert_eq!(meta.id, 1u64);
    assert_eq!(meta.goal, 500_000_000i128);
    assert_eq!(meta.deadline, 2_000_000u64);
    assert!(meta.active, "Campaign must be active after creation");
}

#[test]
fn test_create_campaign_accepts_empty_description() {
    let f = setup();
    let owner = Address::generate(&f.env);

    let campaign_id = f.cm.create_campaign(
        &owner,
        &soroban_sdk::String::from_str(&f.env, "No Desc Campaign"),
        &soroban_sdk::String::from_str(&f.env, ""), // Empty description
        &100_000_000i128,
        &2_000_000u64,
        &soroban_sdk::String::from_str(&f.env, "General"),
    );

    assert_eq!(campaign_id, 1u64);
    let meta = f.cm.get_campaign(&campaign_id);
    assert_eq!(meta.description, soroban_sdk::String::from_str(&f.env, ""));
}

#[test]
fn test_multiple_campaigns_registered() {
    let f = setup();
    let owner = Address::generate(&f.env);

    for i in 1u64..=3 {
        let id = f.cm.create_campaign(
            &owner,
            &soroban_sdk::String::from_str(&f.env, "Campaign"),
            &soroban_sdk::String::from_str(&f.env, "desc"),
            &100_000_000i128,
            &2_000_000u64,
            &soroban_sdk::String::from_str(&f.env, "Tech"),
        );
        assert_eq!(id, i, "Campaign IDs must be sequential");
        assert_eq!(f.dm.get_campaign_funds(&id), 0i128);
    }

    let all = f.cm.get_all_campaigns();
    assert_eq!(
        all.len(),
        3u32,
        "get_all_campaigns must return all 3 campaigns"
    );
}

#[test]
fn test_create_campaign_rejects_past_deadline() {
    let f = setup();
    let owner = Address::generate(&f.env);

    let result = f.cm.try_create_campaign(
        &owner,
        &soroban_sdk::String::from_str(&f.env, "Late"),
        &soroban_sdk::String::from_str(&f.env, "too late"),
        &100_000_000i128,
        &500_000u64,
        &soroban_sdk::String::from_str(&f.env, "Art"),
    );

    assert!(
        result.is_err(),
        "Past deadline must be rejected with InvalidInput"
    );
}

#[test]
fn test_create_campaign_rejects_zero_goal() {
    let f = setup();
    let owner = Address::generate(&f.env);

    let result = f.cm.try_create_campaign(
        &owner,
        &soroban_sdk::String::from_str(&f.env, "Free"),
        &soroban_sdk::String::from_str(&f.env, "free money"),
        &0i128,
        &2_000_000u64,
        &soroban_sdk::String::from_str(&f.env, "Finance"),
    );

    assert!(
        result.is_err(),
        "Zero goal must be rejected with InvalidInput"
    );
}
