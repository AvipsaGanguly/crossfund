#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, IntoVal, String, Vec};

mod types;
use types::{CampaignMetadata, DataKey, Error};

#[cfg(test)]
mod test;

#[contract]
pub struct CampaignManager;

#[contractimpl]
impl CampaignManager {
    /// Initialize with the donation manager address (which handles the funds)
    pub fn init(env: Env, donation_manager: Address) {
        env.storage()
            .instance()
            .set(&DataKey::DonationManager, &donation_manager);
    }

    /// Create a new campaign and notify the donation manager
    pub fn create_campaign(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
        category: String,
    ) -> Result<u64, Error> {
        owner.require_auth();

        // ── DIAGNOSTIC: emit inputs so simulation can be inspected ──────────
        let current_time = env.ledger().timestamp();
        env.events()
            .publish((symbol_short!("diag"), symbol_short!("goal")), goal);
        env.events().publish(
            (symbol_short!("diag"), symbol_short!("cur_time")),
            current_time,
        );
        env.events()
            .publish((symbol_short!("diag"), symbol_short!("deadline")), deadline);
        // ── END DIAGNOSTIC ───────────────────────────────────────────────────

        if goal <= 0 {
            env.events().publish(
                (symbol_short!("diag"), symbol_short!("fail")),
                symbol_short!("goal_chk"),
            );
            return Err(Error::InvalidInput);
        }

        if deadline <= current_time {
            env.events().publish(
                (symbol_short!("diag"), symbol_short!("fail")),
                symbol_short!("dl_chk"),
            );
            return Err(Error::InvalidInput); // Deadline in past
        }

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        count += 1;

        let campaign = CampaignMetadata {
            id: count,
            owner: owner.clone(),
            title,
            description,
            goal,
            deadline,
            category,
            active: true,
        };

        // Save metadata and update campaign count
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(count), &campaign);
        env.storage()
            .instance()
            .set(&DataKey::CampaignCount, &count);

        // Maintain persistent vector of campaign IDs
        let mut campaign_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignIds)
            .unwrap_or_else(|| Vec::new(&env));
        campaign_ids.push_back(count);
        env.storage()
            .persistent()
            .set(&DataKey::CampaignIds, &campaign_ids);

        // Notify Donation Manager
        let donation_manager: Address = env
            .storage()
            .instance()
            .get(&DataKey::DonationManager)
            .ok_or(Error::DonationManagerNotSet)?;

        // ── Authorize the cross-contract call on behalf of this contract ─────
        // Soroban rule: require_auth() may only be called in the ROOT invocation.
        // DonationManager::register_campaign() calls cm.require_auth(), which means
        // CampaignManager must pre-declare its authorization for that sub-call here,
        // BEFORE env.invoke_contract is called. Without this,
        // Error(Auth, InvalidAction) is thrown.
        use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
        env.authorize_as_current_contract(soroban_sdk::vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: donation_manager.clone(),
                    fn_name: soroban_sdk::Symbol::new(&env, "register_campaign"),
                    args: (count,).into_val(&env),
                },
                sub_invocations: soroban_sdk::vec![&env],
            }),
        ]);

        // Invoke cross-contract call
        env.invoke_contract::<()>(
            &donation_manager,
            &soroban_sdk::Symbol::new(&env, "register_campaign"),
            soroban_sdk::vec![&env, count.into_val(&env)],
        );

        Ok(count)
    }

    pub fn close_campaign(env: Env, campaign_id: u64) -> Result<(), Error> {
        let mut campaign: CampaignMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;

        campaign.owner.require_auth();
        campaign.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
        Ok(())
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Result<CampaignMetadata, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)
    }

    /// Return all campaign metadata in a single read-only function
    pub fn get_all_campaigns(env: Env) -> Vec<CampaignMetadata> {
        let campaign_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignIds)
            .unwrap_or_else(|| Vec::new(&env));

        let mut all_campaigns = Vec::new(&env);
        for id in campaign_ids.iter() {
            if let Some(campaign) = env
                .storage()
                .persistent()
                .get::<DataKey, CampaignMetadata>(&DataKey::Campaign(id))
            {
                all_campaigns.push_back(campaign);
            }
        }
        all_campaigns
    }
}
