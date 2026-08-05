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
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DonationStatus {
    Pending = 1,
    Confirmed = 2,
    Cancelled = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingDonation {
    pub deposit_id: String,
    pub campaign_id: u64,
    pub donor: Address,
    pub token_address: Address,
    pub amount: i128,
    pub status: DonationStatus,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    CampaignFunds(u64), // Tracks raised amount
    CampaignAssetFunds(u64, Address), // Tracks raised amount per asset token
    CampaignManager,
    TokenAddress,
    PendingDonation(String), // Tracks pending donation by deposit_id
    ProcessedDeposit(String), // Idempotency check for processed deposit_ids
    CampaignPendingFunds(u64), // Tracks pending funds for a campaign
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
    DepositAlreadyProcessed = 9,
    PendingDonationNotFound = 10,
    PendingDonationInvalidState = 11,
}
