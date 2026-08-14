/**
 * @file src/__tests__/FiatDepositModal.test.jsx
 * @description Vitest component tests for FiatDepositModal (SEP-24 Deposit Flow).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FiatDepositModal from '../components/FiatDepositModal';

// Mock Wallet Hook
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    walletState: { address: 'GAAABBBCCCDDDEEEFFFGGGHHHIIIJJJKKKLLLMMMNNNOOOPPPQQQRRR' },
  }),
}));

// Mock Wallet Services
vi.mock('../services/wallet', () => ({
  signTransaction: vi.fn().mockResolvedValue('AAAA_SIGNED_XDR_MOCK'),
}));

// Mock Campaign Services
vi.mock('../services/campaign', () => ({
  buildDonateTx: vi.fn().mockResolvedValue({ xdr: 'BUILD_DONATE_TX_MOCK' }),
}));

// Mock Contract Services
vi.mock('../services/contract', () => ({
  submitTransaction: vi.fn().mockResolvedValue('tx_hash_donation_bridge_12345'),
  pollTransactionStatus: vi.fn().mockResolvedValue({ status: 'SUCCESS' }),
}));

// Mock Stellar Services
vi.mock('../services/stellar', () => ({
  estimatePathPayment: vi.fn().mockResolvedValue({
    hasPath: true,
    rate: 0.95,
    estimatedDestAmount: 95,
    pathHops: ['SRT', 'Stellar_DEX', 'XLM'],
  }),
}));

// Mock Anchor Services
vi.mock('../services/anchorService', () => ({
  DEFAULT_TESTNET_ANCHOR: 'testanchor.stellar.org',
  getAnchorTomlInfo: vi.fn().mockResolvedValue({
    webAuthEndpoint: 'https://testanchor.stellar.org/auth',
    transferServerSep24: 'https://testanchor.stellar.org/sep24',
    kycServer: 'https://testanchor.stellar.org/sep12',
    currencies: [{ code: 'SRT' }],
  }),
  submitCustomerKyc: vi.fn().mockResolvedValue({ id: 'kyc_123', status: 'ACCEPTED' }),
  authenticateWithAnchor: vi.fn().mockResolvedValue('MOCK_JWT_BEARER_TOKEN'),
  initiateInteractiveDeposit: vi.fn().mockResolvedValue({
    id: 'dep_test_123',
    url: 'https://testanchor.stellar.org/sep24/interactive/deposit?id=dep_test_123',
  }),
  getDepositTransactionStatus: vi.fn().mockResolvedValue({
    id: 'dep_test_123',
    status: 'completed',
    amount_in: '100',
    asset_code: 'SRT',
    stellar_transaction_id: 'hash_abc_123',
  }),
}));

describe('FiatDepositModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    campaignId: '1',
    campaignTitle: 'Clean Energy Innovation',
    onDepositComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal header and campaign details when open', () => {
    render(<FiatDepositModal {...defaultProps} />);

    expect(screen.getByText(/Donate with Fiat via Stellar Anchor/i)).toBeInTheDocument();
    expect(screen.getByText(/Clean Energy Innovation/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Fiat Checkout & Path Payment/i)).toBeInTheDocument();
  });

  it('displays estimated conversion rate for path payments', async () => {
    render(<FiatDepositModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Estimated Rate:/i)).toBeInTheDocument();
      expect(screen.getByText(/1 SRT ≈ 0.9500 XLM/i)).toBeInTheDocument();
    });
  });

  it('triggers interactive deposit checkout flow on button click', async () => {
    render(<FiatDepositModal {...defaultProps} />);

    const startBtn = screen.getByText(/Start Fiat Checkout & Path Payment/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTitle(/Stellar Anchor SEP-24 Interactive Deposit/i)).toBeInTheDocument();
    });
  });

  it('handles offline anchor error gracefully', async () => {
    const { getAnchorTomlInfo } = await import('../services/anchorService');
    getAnchorTomlInfo.mockRejectedValueOnce(new Error('Network error'));

    render(<FiatDepositModal {...defaultProps} />);

    const startBtn = screen.getByText(/Start Fiat Checkout & Path Payment/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Anchor Service Offline/i)).toBeInTheDocument();
    });
  });

  it('handles KYC rejection status cleanly', async () => {
    const { submitCustomerKyc } = await import('../services/anchorService');
    submitCustomerKyc.mockRejectedValueOnce(new Error('KYC verification was rejected by anchor server.'));

    render(<FiatDepositModal {...defaultProps} />);

    const startBtn = screen.getByText(/Start Fiat Checkout & Path Payment/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Fiat Deposit Failed/i)).toBeInTheDocument();
    });
  });
});
