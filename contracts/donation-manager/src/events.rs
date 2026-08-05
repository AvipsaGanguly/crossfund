use soroban_sdk::{symbol_short, Address, Env};

pub fn donation_received(env: &Env, campaign_id: u64, donor: Address, amount: i128) {
    let topics = (symbol_short!("donated"), campaign_id, donor);
    env.events().publish(topics, amount);
}

pub fn funds_withdrawn(env: &Env, campaign_id: u64, owner: Address, amount: i128) {
    let topics = (symbol_short!("withdraw"), campaign_id, owner);
    env.events().publish(topics, amount);
}
