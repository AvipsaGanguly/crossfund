import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockShouldReject = false;
const mockAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockModule = {
  productId: 'freighter',
  getAddress: vi.fn(async () => {
    if (mockShouldReject) {
      throw new Error('User denied wallet connection request');
    }
    return { address: mockAddress };
  }),
};

// Mock @creit.tech/stellar-wallets-kit
vi.mock('@creit.tech/stellar-wallets-kit', () => {
  const MockStellarWalletsKit = {
    init: vi.fn(),
    setWallet: vi.fn((walletId) => {
      mockModule.productId = walletId;
    }),
    get selectedModule() {
      return mockModule;
    },
    authModal: vi.fn(async () => {
      if (mockShouldReject) {
        throw new Error('User denied wallet authentication request');
      }
      return { address: mockAddress };
    }),
    signTransaction: vi.fn(async (xdr) => {
      if (xdr === 'INVALID_REJECT') {
        throw new Error('User cancelled transaction signing');
      }
      return { signedTxXdr: 'SIGNED_' + xdr, signerAddress: mockAddress };
    }),
  };

  return {
    StellarWalletsKit: MockStellarWalletsKit,
    Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  };
});

vi.mock('@creit.tech/stellar-wallets-kit/modules/freighter', () => ({ FreighterModule: function () {} }));
vi.mock('@creit.tech/stellar-wallets-kit/modules/xbull', () => ({ xBullModule: function () {} }));
vi.mock('@creit.tech/stellar-wallets-kit/modules/albedo', () => ({ AlbedoModule: function () {} }));
vi.mock('@creit.tech/stellar-wallets-kit/modules/lobstr', () => ({ LobstrModule: function () {} }));
vi.mock('@creit.tech/stellar-wallets-kit/modules/rabet', () => ({ RabetModule: function () {} }));

import {
  connectWallet,
  disconnectWallet,
  switchWallet,
  getActiveWallet,
  isWalletConnected,
  signTransaction,
  SUPPORTED_WALLETS,
} from '../services/wallet';

describe('wallet.js Service', () => {
  beforeEach(() => {
    disconnectWallet();
    mockShouldReject = false;
    vi.clearAllMocks();
  });

  it('connects via authModal when no wallet ID is passed', async () => {
    const result = await connectWallet();
    expect(result.isConnected).toBe(true);
    expect(result.address).toBe(mockAddress);
    expect(isWalletConnected()).toBe(true);
  });

  it('connects to Freighter wallet successfully when walletId is specified', async () => {
    const result = await connectWallet(SUPPORTED_WALLETS.FREIGHTER);
    expect(result.isConnected).toBe(true);
    expect(result.walletId).toBe('freighter');
    expect(result.address).toBe(mockAddress);

    expect(isWalletConnected()).toBe(true);
    expect(getActiveWallet()).toEqual({
      walletId: 'freighter',
      address: mockAddress,
      isConnected: true,
    });
  });

  it('connects to xBull wallet successfully', async () => {
    const result = await connectWallet(SUPPORTED_WALLETS.XBULL);
    expect(result.isConnected).toBe(true);
    expect(result.walletId).toBe('xbull');
  });

  it('throws descriptive error for unsupported wallet', async () => {
    await expect(connectWallet('metamask')).rejects.toThrow(/Unsupported wallet/);
  });

  it('throws descriptive error when wallet connection is rejected', async () => {
    mockShouldReject = true;
    await expect(connectWallet(SUPPORTED_WALLETS.FREIGHTER)).rejects.toThrow(/rejected by the user/);
  });

  it('disconnects wallet and clears in-memory state', async () => {
    await connectWallet(SUPPORTED_WALLETS.FREIGHTER);
    expect(isWalletConnected()).toBe(true);

    disconnectWallet();
    expect(isWalletConnected()).toBe(false);
    expect(getActiveWallet().isConnected).toBe(false);
    expect(getActiveWallet().address).toBeNull();
  });

  it('switches wallet successfully by clearing old session and connecting new wallet', async () => {
    await connectWallet(SUPPORTED_WALLETS.FREIGHTER);
    expect(getActiveWallet().walletId).toBe('freighter');

    const result = await switchWallet(SUPPORTED_WALLETS.XBULL);
    expect(result.isConnected).toBe(true);
    expect(result.walletId).toBe('xbull');
    expect(getActiveWallet().walletId).toBe('xbull');
  });

  it('signs transaction when wallet is connected', async () => {
    await connectWallet(SUPPORTED_WALLETS.FREIGHTER);
    const res = await signTransaction('TEST_UNSIGNED_XDR');
    expect(res).toEqual({ signedTxXdr: 'SIGNED_TEST_UNSIGNED_XDR', signerAddress: mockAddress });
  });

  it('throws error when trying to sign transaction without connected wallet', async () => {
    await expect(signTransaction('TEST_XDR')).rejects.toThrow(/No wallet connected/);
  });

  it('throws descriptive error when user rejects transaction signature', async () => {
    await connectWallet(SUPPORTED_WALLETS.FREIGHTER);
    await expect(signTransaction('INVALID_REJECT')).rejects.toThrow(/rejected by the user/);
  });
});
