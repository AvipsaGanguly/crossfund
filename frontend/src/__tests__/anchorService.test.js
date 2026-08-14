/**
 * @file src/__tests__/anchorService.test.js
 * @description Vitest unit tests for anchorService (SEP-1, SEP-10, SEP-24).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAnchorTomlInfo,
  submitCustomerKyc,
  authenticateWithAnchor,
  initiateInteractiveDeposit,
  initiateInteractiveWithdrawal,
  getDepositTransactionStatus,
} from '../services/anchorService';

// Mock wallet module
vi.mock('../services/wallet', () => ({
  signTransaction: vi.fn().mockResolvedValue('AAAA_SIGNED_XDR_MOCK'),
}));

describe('anchorService (SEP-1, SEP-10, SEP-24)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnchorTomlInfo (SEP-1)', () => {
    it('fetches and parses stellar.toml correctly', async () => {
      const mockTomlText = `
WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth"
TRANSFER_SERVER_SEP0024 = "https://testanchor.stellar.org/sep24"
KYC_SERVER = "https://testanchor.stellar.org/kyc"

[[CURRENCIES]]
code = "SRT"
issuer = "GCDNJBDQUBWCDFRB2OPFDYDLY2CYCD2RP34WECWTESPB2CYD2RP34WEC"
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockTomlText,
      });

      const info = await getAnchorTomlInfo('testanchor.stellar.org');

      expect(info.webAuthEndpoint).toBe('https://testanchor.stellar.org/auth');
      expect(info.transferServerSep24).toBe('https://testanchor.stellar.org/sep24');
      expect(info.currencies[0].code).toBe('SRT');
    });

    it('uses fallback configuration when anchor is unreachable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const info = await getAnchorTomlInfo('offline-anchor.org');

      expect(info.webAuthEndpoint).toBe('https://offline-anchor.org/auth');
      expect(info.transferServerSep24).toBe('https://offline-anchor.org/sep24');
      expect(info.currencies[0].code).toBe('SRT');
    });
  });

  describe('submitCustomerKyc (SEP-12)', () => {
    it('submits customer KYC info via PUT /customer and returns ACCEPTED status', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cust_kyc_999',
          status: 'ACCEPTED',
        }),
      });

      const res = await submitCustomerKyc('https://testanchor.stellar.org/sep12', 'MOCK_JWT', {
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com',
        id_type: 'passport',
        id_number: 'A12345678',
      });

      expect(res.id).toBe('cust_kyc_999');
      expect(res.status).toBe('ACCEPTED');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://testanchor.stellar.org/sep12/customer',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer MOCK_JWT',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('authenticateWithAnchor (SEP-10)', () => {
    it('completes WebAuth challenge & returns JWT token', async () => {
      const userPublicKey = 'GAAABBBCCCDDDEEEFFFGGGHHHIIIJJJKKKLLLMMMNNNOOOPPPQQQRRR';

      global.fetch = vi
        .fn()
        // 1. Challenge response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            transaction: 'AAAA_CHALLENGE_XDR_MOCK',
            network_passphrase: 'Test SDF Network ; September 2015',
          }),
        })
        // 2. JWT Token response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MOCK_JWT_TOKEN',
          }),
        });

      const jwt = await authenticateWithAnchor('https://testanchor.stellar.org/auth', userPublicKey);

      expect(jwt).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MOCK_JWT_TOKEN');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws error when challenge request fails', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid account parameter',
      });

      await expect(
        authenticateWithAnchor('https://testanchor.stellar.org/auth', 'INVALID_KEY')
      ).rejects.toThrow('SEP-10 Challenge failed');
    });
  });

  describe('initiateInteractiveDeposit & initiateInteractiveWithdrawal (SEP-24)', () => {
    it('initiates interactive deposit and returns checkout URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dep_12345',
          url: 'https://testanchor.stellar.org/sep24/interactive/deposit?id=dep_12345',
          type: 'interactive_customer_info_needed',
        }),
      });

      const res = await initiateInteractiveDeposit('https://testanchor.stellar.org/sep24', 'MOCK_JWT', {
        assetCode: 'SRT',
        userPublicKey: 'G12345',
      });

      expect(res.id).toBe('dep_12345');
      expect(res.url).toContain('interactive/deposit');
    });

    it('initiates interactive withdrawal and returns checkout URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'wd_67890',
          url: 'https://testanchor.stellar.org/sep24/interactive/withdraw?id=wd_67890',
          type: 'interactive_customer_info_needed',
        }),
      });

      const res = await initiateInteractiveWithdrawal('https://testanchor.stellar.org/sep24', 'MOCK_JWT', {
        assetCode: 'SRT',
        userPublicKey: 'G12345',
      });

      expect(res.id).toBe('wd_67890');
      expect(res.url).toContain('interactive/withdraw');
    });

    it('queries deposit transaction status', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'dep_12345',
            status: 'completed',
            amount_in: '100',
            asset_code: 'SRT',
            stellar_transaction_id: 'tx_hash_9999',
          },
        }),
      });

      const tx = await getDepositTransactionStatus('https://testanchor.stellar.org/sep24', 'MOCK_JWT', 'dep_12345');

      expect(tx.id).toBe('dep_12345');
      expect(tx.status).toBe('completed');
      expect(tx.stellar_transaction_id).toBe('tx_hash_9999');
    });
  });
});
