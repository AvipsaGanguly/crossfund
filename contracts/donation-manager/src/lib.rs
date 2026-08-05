#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, IntoVal, Symbol};

mod events;
mod types;
use types::{CampaignMetadata, DataKey, Error};

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

        // Ensure the transaction was authorized by the campaign manager.
        // The CampaignManager must call env.authorize_as_current_contract()
        // before invoking this function, otherwise Error(Auth, InvalidAction)
        // is thrown by the Soroban host because require_auth() is in a
        // sub-invocation, not the root invocation.
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

    pub fn donate(env: Env, donor: Address, campaign_id: u64, amount: i128) -> Result<(), Error> {
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
        let campaign: CampaignMetadata = env.invoke_contract(
            &cm,
            &Symbol::new(&env, "get_campaign"),
            soroban_sdk::vec![&env, campaign_id.into_val(&env)],
        );

        if !campaign.active {
            return Err(Error::CampaignInactive);
        }

        let current_time = env.ledger().timestamp();
        if current_time >= campaign.deadline {
            return Err(Error::DeadlinePassed);
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&donor, &env.current_contract_address(), &amount);

        raised += amount;
        env.storage()
            .persistent()
            .set(&DataKey::CampaignFunds(campaign_id), &raised);

        events::donation_received(&env, campaign_id, donor, amount);

        Ok(())
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
