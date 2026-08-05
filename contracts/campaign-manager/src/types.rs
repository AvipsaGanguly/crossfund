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
    Campaign(u64),
    CampaignCount,
    DonationManager,
    CampaignIds,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    CampaignNotFound = 1,
    NotAuthorized = 2,
    InvalidInput = 3,
    DonationManagerNotSet = 4,
}
