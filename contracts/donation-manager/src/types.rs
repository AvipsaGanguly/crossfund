use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CampaignMetadata {
    pub id: u64,
    pub owner: Address,
    pub title: String,
    pub description: String,
    pub goal: i128,
    pub deadline: u64,
    pub category: String,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    CampaignFunds(u64), // Tracks raised amount
    CampaignManager,
    TokenAddress,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    CampaignNotRegistered = 2,
    DeadlinePassed = 3,
    GoalNotReached = 4,
    DeadlineNotPassed = 5,
    CampaignInactive = 6,
    InvalidAmount = 7,
    SetupIncomplete = 8,
}
