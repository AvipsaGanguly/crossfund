#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, IntoVal, Symbol};

mod events;
mod types;
use types::{CampaignMetadata, DataKey, DonationStatus, Error, PendingDonation};

#[contract]
pub struct DonationManager;

#[contractimpl]
impl DonationManager {
    pub fn init(env: Env, campaign_manager: Address, token_address: Address) {
        env.storage()
            .instance()
            .set(&DataKey::CampaignManager, &campaign_manager);
        env.storage()
            .instance()
            .set(&DataKey::TokenAddress, &token_address);
    }

    /// Register a campaign. Can only be called by the Campaign Manager.
    pub fn register_campaign(env: Env, campaign_id: u64) -> Result<(), Error> {
        let cm: Address = env
            .storage()
            .instance()
            .get(&DataKey::CampaignManager)
            .ok_or(Error::SetupIncomplete)?;

        cm.require_auth();

        // Initialize funds to 0
        env.storage()
            .persistent()
            .set(&DataKey::CampaignFunds(campaign_id), &0i128);
        Ok(())
    }

    /// Returns the total amount raised for a campaign. Returns 0 if not registered.
    pub fn get_campaign_funds(env: Env, campaign_id: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignFunds(campaign_id))
            .unwrap_or(0i128)
    }

    /// Standard donation using contract default token (backward compatible)
    pub fn donate(env: Env, donor: Address, campaign_id: u64, amount: i128) -> Result<(), Error> {
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::SetupIncomplete)?;
        Self::donate_with_asset(env, donor, campaign_id, token_address, amount)
    }

    /// Multi-Asset Donation: Supports donating any SAC token asset (e.g. USDC, SRT)
    pub fn donate_with_asset(
        env: Env,
        donor: Address,
        campaign_id: u64,
        token_address: Address,
        amount: i128,
    ) -> Result<(), Error> {
        donor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignFunds(campaign_id))
            .ok_or(Error::CampaignNotRegistered)?;

        let cm: Address = env
            .storage()
            .instance()
            .get(&DataKey::CampaignManager)
            .ok_or(Error::SetupIncomplete)?;

        // Fetch metadata from Campaign Manager
        if let Ok(Ok(campaign)) = env.try_invoke_contract::<CampaignMetadata, soroban_sdk::Error>(
            &cm,
            &Symbol::new(&env, "get_campaign"),
            soroban_sdk::vec![&env, campaign_id.into_val(&env)],
        ) {
            if !campaign.active {
                return Err(Error::CampaignInactive);
            }

            let current_time = env.ledger().timestamp();
            if current_time >= campaign.deadline {
                return Err(Error::DeadlinePassed);
            }
        }

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&donor, &env.current_contract_address(), &amount);

        raised += amount;
        env.storage()
            .persistent()
            .set(&DataKey::CampaignFunds(campaign_id), &raised);

        // Track per-asset funds
        let mut asset_raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignAssetFunds(campaign_id, token_address.clone()))
            .unwrap_or(0i128);
        asset_raised += amount;
        env.storage()
            .persistent()
            .set(&DataKey::CampaignAssetFunds(campaign_id, token_address), &asset_raised);

        events::donation_received(&env, campaign_id, donor, amount);

        Ok(())
    }

    /// Record a pending anchor deposit for asynchronous settlement
    pub fn record_pending_donation(
        env: Env,
        donor: Address,
        campaign_id: u64,
        deposit_id: soroban_sdk::String,
        amount: i128,
        token_address: Address,
    ) -> Result<(), Error> {
        donor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Idempotency check: Reject if deposit_id already processed or pending
        if env.storage().persistent().has(&DataKey::ProcessedDeposit(deposit_id.clone()))
            || env.storage().persistent().has(&DataKey::PendingDonation(deposit_id.clone()))
        {
            return Err(Error::DepositAlreadyProcessed);
        }

        let pending = PendingDonation {
            deposit_id: deposit_id.clone(),
            campaign_id,
            donor: donor.clone(),
            token_address,
            amount,
            status: DonationStatus::Pending,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::PendingDonation(deposit_id), &pending);

        let mut pending_funds: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignPendingFunds(campaign_id))
            .unwrap_or(0i128);
        pending_funds += amount;
        env.storage()
            .persistent()
            .set(&DataKey::CampaignPendingFunds(campaign_id), &pending_funds);

        events::pending_recorded(&env, campaign_id, donor, amount);
        Ok(())
    }

    /// Confirm a pending anchor deposit upon on-chain settlement with Idempotency Protection
    pub fn confirm_pending_donation(env: Env, deposit_id: soroban_sdk::String) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::ProcessedDeposit(deposit_id.clone())) {
            return Err(Error::DepositAlreadyProcessed);
        }

        let mut pending: PendingDonation = env
            .storage()
            .persistent()
            .get(&DataKey::PendingDonation(deposit_id.clone()))
            .ok_or(Error::PendingDonationNotFound)?;

        if pending.status != DonationStatus::Pending {
            return Err(Error::PendingDonationInvalidState);
        }

        // Execute asset transfer from donor/anchor to contract
        let token_client = token::Client::new(&env, &pending.token_address);
        token_client.transfer(&pending.donor, &env.current_contract_address(), &pending.amount);

        // Mark as confirmed and processed (idempotency key)
        pending.status = DonationStatus::Confirmed;
        env.storage()
            .persistent()
            .set(&DataKey::PendingDonation(deposit_id.clone()), &pending);
        env.storage()
            .persistent()
            .set(&DataKey::ProcessedDeposit(deposit_id), &true);

        // Move amount from pending to confirmed raised funds
        let mut pending_funds: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignPendingFunds(pending.campaign_id))
            .unwrap_or(0i128);
        pending_funds = pending_funds.saturating_sub(pending.amount);
        env.storage()
            .persistent()
            .set(&DataKey::CampaignPendingFunds(pending.campaign_id), &pending_funds);

        let mut raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignFunds(pending.campaign_id))
            .unwrap_or(0i128);
        raised += pending.amount;
        env.storage()
            .persistent()
            .set(&DataKey::CampaignFunds(pending.campaign_id), &raised);

        events::pending_confirmed(&env, pending.campaign_id, pending.donor, pending.amount);
        Ok(())
    }

    pub fn get_pending_donation(env: Env, deposit_id: soroban_sdk::String) -> Result<PendingDonation, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::PendingDonation(deposit_id))
            .ok_or(Error::PendingDonationNotFound)
    }

    pub fn get_pending_funds(env: Env, campaign_id: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignPendingFunds(campaign_id))
            .unwrap_or(0i128)
    }

    pub fn get_campaign_asset_funds(env: Env, campaign_id: u64, token_address: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignAssetFunds(campaign_id, token_address))
            .unwrap_or(0i128)
    }

    pub fn withdraw(env: Env, campaign_id: u64) -> Result<(), Error> {
        let cm: Address = env
            .storage()
            .instance()
            .get(&DataKey::CampaignManager)
            .ok_or(Error::SetupIncomplete)?;

        let campaign: CampaignMetadata = env.invoke_contract(
            &cm,
            &Symbol::new(&env, "get_campaign"),
            soroban_sdk::vec![&env, campaign_id.into_val(&env)],
        );

        campaign.owner.require_auth();

        let mut raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignFunds(campaign_id))
            .ok_or(Error::CampaignNotRegistered)?;

        if raised < campaign.goal {
            return Err(Error::GoalNotReached);
        }

        let current_time = env.ledger().timestamp();
        if current_time < campaign.deadline {
            return Err(Error::DeadlineNotPassed);
        }

        let amount_to_transfer = raised;
        raised = 0; // Prevent re-entrancy
        env.storage()
            .persistent()
            .set(&DataKey::CampaignFunds(campaign_id), &raised);

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(
            &env.current_contract_address(),
            &campaign.owner,
            &amount_to_transfer,
        );

        events::funds_withdrawn(&env, campaign_id, campaign.owner, amount_to_transfer);

        Ok(())
    }
}

#[cfg(test)]
mod test;
