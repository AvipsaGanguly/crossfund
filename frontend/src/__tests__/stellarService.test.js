import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/contract', () => ({
  server: {},
  buildTransaction: vi.fn(async (sourceAddress, builderFn) => {
    const mockBuilder = { addOperation: vi.fn() };
    builderFn(mockBuilder);
    return { toXDR: () => 'MOCK_TX_XDR' };
  }),
  simulateTransaction: vi.fn(async (tx) => {
    if (tx.failSim) {
      throw new Error('Simulation error: contract panicked');
    }
    return {
      result: { retval: 'MOCK_RETVAL' },
    };
  }),
  submitTransaction: vi.fn(async (signedXdr) => {
    if (signedXdr === 'SIGNED_REJECT_XDR') {
      throw new Error('Transaction submission failed');
    }
    return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  }),
  pollTransactionStatus: vi.fn(async (hash) => {
    if (hash === 'FAIL_HASH') {
      throw new Error('Transaction failed on-chain.');
    }
    return { status: 'SUCCESS' };
  }),
}));

vi.mock('../services/campaign', () => ({
  buildCreateCampaignTx: vi.fn(async () => ({ toXDR: () => 'CREATE_CAMPAIGN_XDR' })),
  buildDonateTx: vi.fn(async () => ({ toXDR: () => 'DONATE_XDR' })),
  buildWithdrawTx: vi.fn(async () => ({ toXDR: () => 'WITHDRAW_XDR' })),
  fetchCampaign: vi.fn(async (id) => {
    if (id === 999) return null;
    return { id, title: 'Test Campaign', goal: 1000 };
  }),
  fetchAllCampaigns: vi.fn(async () => [
    { id: 1, title: 'Campaign 1', goal: 500 },
    { id: 2, title: 'Campaign 2', goal: 1000 },
  ]),
}));

vi.mock('../services/wallet', () => ({
  isWalletConnected: vi.fn(() => true),
  getActiveWallet: vi.fn(() => ({
    walletId: 'freighter',
    address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    isConnected: true,
  })),
  signTransaction: vi.fn(async (xdr) => {
    if (xdr === 'REJECT_XDR') {
      throw new Error('User denied wallet signature request');
    }
    return 'SIGNED_' + xdr;
  }),
}));

vi.mock('@stellar/stellar-sdk', () => ({
  rpc: {
    isSimulationError: vi.fn((sim) => sim?.isError || false),
    assembleTransaction: vi.fn(() => ({
      build: () => ({
        toXDR: () => 'PREPARED_XDR',
      }),
    })),
  },
  TransactionBuilder: vi.fn(),
}));

import {
  createCampaign,
  donate,
  withdraw,
  fetchCampaign,
  fetchAllCampaigns,
  sendSorobanTransaction,
} from '../services/stellar';
import { isWalletConnected } from '../services/wallet';

describe('stellar.js Master Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isWalletConnected).mockReturnValue(true);
  });

  it('createCampaign executes successfully and returns hash, status, explorerUrl', async () => {
    const result = await createCampaign({
      title: 'Build Solar School',
      description: 'Solar energy project',
      goal: 5000,
      durationDays: 30,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.hash).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    expect(result.explorerUrl).toContain('stellar.expert');
  });

  it('donate executes successfully with valid parameters', async () => {
    const result = await donate(1, 100);
    expect(result.status).toBe('SUCCESS');
    expect(result.hash).toBeDefined();
    expect(result.explorerUrl).toContain(result.hash);
  });

  it('withdraw executes successfully with valid campaign ID', async () => {
    const result = await withdraw(1);
    expect(result.status).toBe('SUCCESS');
    expect(result.hash).toBeDefined();
  });

  it('fetchCampaign returns campaign data for valid ID', async () => {
    const campaign = await fetchCampaign(1);
    expect(campaign).toEqual({ id: 1, title: 'Test Campaign', goal: 1000 });
  });

  it('fetchAllCampaigns returns array of active campaigns', async () => {
    const campaigns = await fetchAllCampaigns();
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].title).toBe('Campaign 1');
  });

  it('throws error when creating campaign with invalid parameters', async () => {
    await expect(createCampaign('', 'desc', 0)).rejects.toThrow(/Invalid campaign parameters/);
  });

  it('throws error when donating with invalid amount', async () => {
    await expect(donate(1, -50)).rejects.toThrow(/Invalid donation amount/);
  });

  it('throws descriptive error when wallet is disconnected', async () => {
    vi.mocked(isWalletConnected).mockReturnValue(false);
    await expect(createCampaign({ title: 'Test', goal: 1000 })).rejects.toThrow(/Wallet is disconnected/);
  });
});
