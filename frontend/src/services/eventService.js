import { server } from './contract';
import { scValToNative } from '@stellar/stellar-sdk';

const DONATION_MANAGER_ID = import.meta.env.VITE_DONATION_MANAGER_ID || 'CAYUM76UIQMEQLE4JBMV2BJWWALTX3T5SGTKV75XBGCE2GQHN3A6YJKR';
const CAMPAIGN_MANAGER_ID = import.meta.env.VITE_CAMPAIGN_MANAGER_ID || 'CAPFOLYX5LZRFZZUPV374HOEXGLIA7QN3SR5SHA5V75W6PBZBK4KM52V';

/**
 * Poll the Soroban RPC for new events since a specific ledger.
 */
export const fetchRecentEvents = async (startLedger) => {
  try {
    const filters = [];
    if (DONATION_MANAGER_ID) {
      filters.push({
        type: "contract",
        contractIds: [DONATION_MANAGER_ID],
        topics: [["*"]]
      });
    }
    
    if (CAMPAIGN_MANAGER_ID) {
      filters.push({
        type: "contract",
        contractIds: [CAMPAIGN_MANAGER_ID],
        topics: [["*"]]
      });
    }

    if (filters.length === 0) return { events: [], latestLedger: startLedger };

    const response = await server.getEvents({
      startLedger,
      filters,
      limit: 50
    });

    const parsedEvents = response.events.map(evt => {
      // Decode XDR topics & data
      // For a real app, you would parse the specific topics matching your contract
      // e.g. Topic[0] == symbol_short("donate")
      let type = 'Unknown';
      let parsedData = {};

      try {
        const topic0 = evt.topic[0] ? scValToNative(evt.topic[0]) : '';
        if (topic0 === 'donate' || topic0 === 'DonationReceived') {
          type = 'DonationReceived';
          // mock parsing for demo until contracts emit exact shaped data
          parsedData = { amount: scValToNative(evt.value), campaignId: scValToNative(evt.topic[1]) };
        } else if (topic0 === 'campaign_created') {
          type = 'CampaignCreated';
          parsedData = { campaignId: scValToNative(evt.topic[1]) };
        }
      } catch (e) {
        // Fallback for demo parsing
        type = 'GenericEvent';
      }

      return {
        id: evt.id,
        type,
        ledger: evt.ledger,
        contractId: evt.contractId,
        data: parsedData,
        raw: evt
      };
    });

    return { 
      events: parsedEvents, 
      latestLedger: response.latestLedger > startLedger ? response.latestLedger : startLedger 
    };

  } catch (error) {
    console.error("Failed to fetch events:", error);
    return { events: [], latestLedger: startLedger };
  }
};
