/**
 * @file src/services/stellar.js
 * @description Master Stellar service for Level 3 Crowdfunding.
 * Integrates contract RPC operations, campaign transaction building, and wallet signing
 * to provide end-to-end execution of Soroban crowdfunding operations with comprehensive error handling.
 */

import { rpc } from '@stellar/stellar-sdk';
import {
  server,
  buildTransaction,
  simulateTransaction,
  submitTransaction,
  pollTransactionStatus,
} from './contract';
import {
  buildCreateCampaignTx,
  buildDonateTx,
  buildWithdrawTx,
  fetchCampaign as fetchCampaignMetadata,
  fetchAllCampaigns as fetchAllCampaignsData,
} from './campaign';
import {
  signTransaction,
  getActiveWallet,
  isWalletConnected,
} from './wallet';

const EXPLORER_BASE_URL = 'https://stellar.expert/explorer/testnet/tx/';

/**
 * Parses and standardizes errors encountered during transaction execution.
 * Categorizes simulation failures, insufficient balance, signature rejection, timeouts, and RPC errors.
 * 
 * @param {Error|any} error - Raw error object
 * @returns {Error} Formatted, human-readable Error object
 */
function parseStellarError(error) {
  const message = error?.message || String(error);
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('reject') || lowerMsg.includes('user denied') || lowerMsg.includes('cancelled')) {
    return new Error('Transaction signature was rejected by the user.');
  }

  if (lowerMsg.includes('insufficient') || lowerMsg.includes('underfunded') || lowerMsg.includes('tx_insufficient_balance')) {
    return new Error('Insufficient wallet balance to cover the transaction amount and gas fees.');
  }

  if (lowerMsg.includes('simulation error') || lowerMsg.includes('simulation failed')) {
    return new Error(`Soroban simulation failure: ${message}`);
  }

  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out') || lowerMsg.includes('polling')) {
    return new Error('Transaction execution timed out waiting for network confirmation.');
  }

  if (lowerMsg.includes('rpc') || lowerMsg.includes('fetch') || lowerMsg.includes('network error')) {
    return new Error(`Stellar RPC network error: ${message}`);
  }

  return new Error(message || 'An unexpected Stellar transaction error occurred.');
}

/**
 * Helper to safely check if a simulation object represents an error.
 * Handles variations in SDK version exports safely.
 * 
 * @param {any} sim - Simulation response object
 * @returns {boolean} True if simulation failed
 */
function isSimulationError(sim) {
  if (!sim) return true;
  // Use bracket notation or intermediate assignment to bypass Vite's strict static analysis of the rpc import namespace
  const rpcRef = rpc;
  if (rpcRef?.Api?.isSimulationError) {
    return rpcRef.Api.isSimulationError(sim);
  }
  if (typeof rpcRef?.isSimulationError === 'function') {
    return rpcRef.isSimulationError(sim);
  }
  return Boolean(sim.error || sim.isError);
}

/**
 * Core transaction pipeline for executing Soroban transactions on Stellar Testnet.
 * Handles simulation, assembling footprint/resources, wallet signing, RPC submission, and polling.
 * 
 * @param {Function} buildTxFn - Function (sourceAddress) => Promise<Transaction> that constructs the unsigned transaction
 * @returns {Promise<{hash: string, explorerUrl: string, status: string, result: any}>} Transaction status payload
 * @throws {Error} Descriptive error on failure
 */
export async function sendSorobanTransaction(buildTxFn) {
  // 1. Check wallet connection
  if (!isWalletConnected()) {
    throw new Error('Wallet is disconnected. Please connect a valid Stellar wallet before proceeding.');
  }

  const { address } = getActiveWallet();
  if (!address) {
    throw new Error('No active public key address found in wallet session.');
  }

  try {
    // 2. Build transaction envelope
    const rawTx = await buildTxFn(address);

    // 3. Simulate transaction to retrieve footprint and resource limits
    let sim;
    try {
      sim = await simulateTransaction(rawTx);
    } catch (simErr) {
      throw parseStellarError(simErr);
    }

    if (isSimulationError(sim)) {
      const errDetail = sim?.error || 'Execution check failed during simulation.';
      throw parseStellarError(new Error(`Soroban simulation failed: ${errDetail}`));
    }

    // 4. Assemble transaction with simulated resources & footprints
    const preparedTx = rpc.assembleTransaction(rawTx, sim).build();

    // 5. Sign transaction via Wallet Service
    let signedXdr;
    try {
      const signedResult = await signTransaction(preparedTx.toXDR());
      signedXdr = typeof signedResult === 'string' ? signedResult : (signedResult?.signedXdr || signedResult?.signedTxXdr || signedResult);
    } catch (signErr) {
      throw parseStellarError(signErr);
    }

    // 6. Submit transaction to RPC server
    let hash;
    try {
      hash = await submitTransaction(signedXdr);
    } catch (submitErr) {
      throw parseStellarError(submitErr);
    }

    // 7. Poll until transaction reaches SUCCESS or FAILED state
    let pollResult;
    try {
      pollResult = await pollTransactionStatus(hash);
    } catch (pollErr) {
      throw parseStellarError(pollErr);
    }

    const explorerUrl = `${EXPLORER_BASE_URL}${hash}`;
    const ledger = pollResult?.ledger || pollResult?.latestLedger || 'N/A';
    let timestamp = 'N/A';
    if (pollResult?.latestLedgerCloseTime) {
      timestamp = new Date(pollResult.latestLedgerCloseTime * 1000).toLocaleString();
    } else if (pollResult?.createdAt) {
      timestamp = new Date(pollResult.createdAt * 1000).toLocaleString();
    } else {
      timestamp = new Date().toLocaleString();
    }

    return {
      hash,
      explorerUrl,
      status: pollResult?.status || 'SUCCESS',
      ledger: String(ledger),
      timestamp,
      result: pollResult,
    };
  } catch (err) {
    throw parseStellarError(err);
  }
}

/**
 * Creates a new crowdfunding campaign on-chain.
 * 
 * @param {Object|string} titleOrParams - Campaign details object or title string
 * @param {string} [description] - Campaign description (optional)
 * @param {number|string} [goal] - Target goal amount in XLM
 * @param {number|string} [durationDaysOrDeadline] - Campaign duration in days or deadline timestamp
 * @param {string} [category='General'] - Campaign category
 * @returns {Promise<{hash: string, explorerUrl: string, status: string}>} Transaction result
 */
export async function createCampaign(titleOrParams, description, goal, durationDaysOrDeadline, category = 'General') {
  let campaignData;

  if (typeof titleOrParams === 'object' && titleOrParams !== null) {
    const { title, description: desc, goal: g, durationDays, deadline, category: cat } = titleOrParams;
    const computedDeadline = deadline || (Math.floor(Date.now() / 1000) + (durationDays || 30) * 86400);
    campaignData = {
      title,
      description: desc || '',
      goal: Number(g),
      deadline: computedDeadline,
      category: cat || 'General',
    };
  } else {
    const computedDeadline = typeof durationDaysOrDeadline === 'number' && durationDaysOrDeadline < 1000000000
      ? Math.floor(Date.now() / 1000) + durationDaysOrDeadline * 86400
      : durationDaysOrDeadline || (Math.floor(Date.now() / 1000) + 30 * 86400);

    campaignData = {
      title: titleOrParams,
      description: description || '',
      goal: Number(goal),
      deadline: computedDeadline,
      category,
    };
  }

  if (!campaignData.title || !campaignData.goal || campaignData.goal <= 0) {
    throw new Error('Invalid campaign parameters: Title and a positive Goal amount are required.');
  }

  return sendSorobanTransaction((sourceAddress) =>
    buildCreateCampaignTx(sourceAddress, campaignData)
  );
}

/**
 * Donates funds to an active crowdfunding campaign.
 * 
 * @param {number|string} campaignId - Target campaign ID
 * @param {number|string} amount - Donation amount in XLM (stroops/units)
 * @returns {Promise<{hash: string, explorerUrl: string, status: string, ledger: string, timestamp: string, donorAddress: string, amountXLM: number}>} Transaction result
 */
export async function donate(campaignId, amount) {
  const parsedId = Number(campaignId);
  const parsedAmount = Number(amount);

  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error('Invalid campaign ID specified for donation.');
  }

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Invalid donation amount: Amount must be greater than zero.');
  }

  const activeWallet = getActiveWallet();

  const txResult = await sendSorobanTransaction((sourceAddress) =>
    buildDonateTx(sourceAddress, parsedId, parsedAmount)
  );

  return {
    ...txResult,
    campaignId: parsedId,
    amountStroops: parsedAmount,
    amountXLM: parsedAmount / 10000000,
    donorAddress: activeWallet?.address || 'N/A',
  };
}

/**
 * Withdraws raised funds for a completed, successful campaign (Owner only).
 * 
 * @param {number|string} campaignId - Target campaign ID to withdraw from
 * @returns {Promise<{hash: string, explorerUrl: string, status: string}>} Transaction result
 */
export async function withdraw(campaignId) {
  const parsedId = Number(campaignId);

  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error('Invalid campaign ID specified for withdrawal.');
  }

  return sendSorobanTransaction((sourceAddress) =>
    buildWithdrawTx(sourceAddress, parsedId)
  );
}

/**
 * Fetches campaign details from the smart contract via read-only RPC simulation.
 * 
 * @param {number|string} campaignId - Target campaign ID
 * @param {string} [publicKey] - Optional wallet address for simulation source account
 * @returns {Promise<Object|null>} Campaign metadata or null if not found
 */
export async function fetchCampaign(campaignId, publicKey) {
  const walletAddress = publicKey || (isWalletConnected() ? getActiveWallet().address : null);
  try {
    const campaign = await fetchCampaignMetadata(campaignId, walletAddress);
    return campaign;
  } catch (error) {
    console.error(`Failed to fetch campaign #${campaignId}:`, error);
    return null;
  }
}

/**
 * Fetches all available crowdfunding campaigns on-chain.
 * 
 * @param {string} [publicKey] - Optional wallet address for simulation source account
 * @returns {Promise<Array<Object>>} Array of fetched campaign objects
 */
export async function fetchAllCampaigns(publicKey) {
  const walletAddress = publicKey || (isWalletConnected() ? getActiveWallet().address : null);
  try {
    const campaigns = await fetchAllCampaignsData(walletAddress);
    return campaigns || [];
  } catch (error) {
    console.error('Failed to fetch all campaigns:', error);
    return [];
  }
}
