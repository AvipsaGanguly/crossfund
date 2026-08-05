import { Contract, xdr, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { server, buildTransaction, simulateTransaction } from './contract';

const CAMPAIGN_MANAGER_ID = import.meta.env.VITE_CAMPAIGN_MANAGER_ID || 'CAPFOLYX5LZRFZZUPV374HOEXGLIA7QN3SR5SHA5V75W6PBZBK4KM52V';
const DONATION_MANAGER_ID = import.meta.env.VITE_DONATION_MANAGER_ID || 'CAYUM76UIQMEQLE4JBMV2BJWWALTX3T5SGTKV75XBGCE2GQHN3A6YJKR';

const cmContract = new Contract(CAMPAIGN_MANAGER_ID);
const dmContract = new Contract(DONATION_MANAGER_ID);

export const buildCreateCampaignTx = async (address, { title, description, goal, deadline, category }) => {
  return buildTransaction(address, (builder) => {
    builder.addOperation(
      cmContract.call("create_campaign",
        nativeToScVal(address, { type: 'address' }),
        nativeToScVal(title, { type: 'string' }),
        nativeToScVal(description || '', { type: 'string' }),
        nativeToScVal(goal, { type: 'i128' }),
        nativeToScVal(deadline, { type: 'u64' }),
        nativeToScVal(category, { type: 'string' })
      )
    );
  });
};

export const buildDonateTx = async (address, campaignId, amount) => {
  return buildTransaction(address, (builder) => {
    builder.addOperation(
      dmContract.call("donate",
        nativeToScVal(address, { type: 'address' }),
        nativeToScVal(campaignId, { type: 'u64' }),
        nativeToScVal(amount, { type: 'i128' })
      )
    );
  });
};

export const buildWithdrawTx = async (address, campaignId) => {
  return buildTransaction(address, (builder) => {
    builder.addOperation(
      dmContract.call("withdraw",
        nativeToScVal(campaignId, { type: 'u64' })
      )
    );
  });
};

/**
 * Fetch campaign funds raised from DonationManager (Read-only call)
 */
export const fetchCampaignFunds = async (id, publicKey) => {
  const source = publicKey || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
  try {
    const tx = await buildTransaction(source, (builder) => {
      builder.addOperation(
        dmContract.call("get_campaign_funds", nativeToScVal(id, { type: 'u64' }))
      );
    });

    const sim = await simulateTransaction(tx);
    if (sim.result && sim.result.retval) {
      return scValToNative(sim.result.retval);
    }
  } catch (e) {
    console.error("Failed to fetch campaign funds:", id, e);
  }
  return 0;
};

/**
 * Fetch a single campaign metadata and raised funds using simulateTransaction (Read-only call)
 */
export const fetchCampaign = async (id, publicKey) => {
  const source = publicKey || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'; 
  try {
    const tx = await buildTransaction(source, (builder) => {
      builder.addOperation(
        cmContract.call("get_campaign", nativeToScVal(id, { type: 'u64' }))
      );
    });

    const sim = await simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) {
      return null;
    }

    const campaign = scValToNative(sim.result.retval);
    if (!campaign) return null;

    // Fetch raised amount from DonationManager
    const raised = await fetchCampaignFunds(id, source);

    return {
      ...campaign,
      raised: raised !== undefined && raised !== null ? raised : 0,
    };
  } catch (e) {
    console.error("Failed to fetch campaign:", id, e);
  }
  return null;
};

/**
 * Fetch all available campaigns sequentially along with their raised amounts.
 */
export const fetchAllCampaigns = async (publicKey) => {
  const campaigns = [];
  let id = 1;
  while (true) {
    const camp = await fetchCampaign(id, publicKey);
    if (!camp) break; // CampaignNotFound or error stops the loop
    campaigns.push(camp);
    id++;
    if (id > 20) break; // Hard limit for safety
  }
  return campaigns;
};
