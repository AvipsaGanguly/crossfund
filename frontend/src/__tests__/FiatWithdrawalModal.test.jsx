/**
 * @file src/__tests__/FiatWithdrawalModal.test.jsx
 * @description Vitest component tests for FiatWithdrawalModal (Creator Bank Off-Ramp).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FiatWithdrawalModal from '../components/FiatWithdrawalModal';

// Mock Wallet Hook
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    walletState: { address: 'GAAABBBCCCDDDEEEFFFGGGHHHIIIJJJKKKLLLMMMNNNOOOPPPQQQRRR' },
  }),
}));

// Mock Campaign Hook
vi.mock('../hooks/useCampaign', () => ({
  useCampaign: () => ({
    withdraw: vi.fn().mockResolvedValue({ status: 'SUCCESS' }),
  }),
}));

// Mock Anchor Services
vi.mock('../services/anchorService', () => ({
  DEFAULT_TESTNET_ANCHOR: 'testanchor.stellar.org',
  getAnchorTomlInfo: vi.fn().mockResolvedValue({
    webAuthEndpoint: 'https://testanchor.stellar.org/auth',
    transferServerSep24: 'https://testanchor.stellar.org/sep24',
    currencies: [{ code: 'SRT' }],
  }),
  authenticateWithAnchor: vi.fn().mockResolvedValue('MOCK_JWT_BEARER_TOKEN'),
  initiateInteractiveWithdrawal: vi.fn().mockResolvedValue({
    id: 'wd_test_456',
    url: 'https://testanchor.stellar.org/sep24/interactive/withdraw?id=wd_test_456',
  }),
  getDepositTransactionStatus: vi.fn().mockResolvedValue({
    id: 'wd_test_456',
    status: 'completed',
    amount_in: '500',
    asset_code: 'SRT',
  }),
}));

describe('FiatWithdrawalModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    campaignId: '1',
    campaignTitle: 'Solar Panel Project',
    raisedAmount: 500,
    onWithdrawComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders creator bank withdrawal modal header and raised balance', () => {
    render(<FiatWithdrawalModal {...defaultProps} />);

    expect(screen.getByText(/Creator Withdrawal to Bank Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar Panel Project/i)).toBeInTheDocument();
    expect(screen.getByText(/Available Raised Funds: 500 XLM \/ SRT/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Bank Withdrawal Flow/i)).toBeInTheDocument();
  });

  it('initiates interactive withdrawal on button click', async () => {
    render(<FiatWithdrawalModal {...defaultProps} />);

    const startBtn = screen.getByText(/Start Bank Withdrawal Flow/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTitle(/Stellar Anchor SEP-24 Interactive Withdrawal/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorize & Release On-Chain Contract Funds/i)).toBeInTheDocument();
    });
  });

  it('executes on-chain contract fund release on authorization click', async () => {
    render(<FiatWithdrawalModal {...defaultProps} />);

    // Start flow
    fireEvent.click(screen.getByText(/Start Bank Withdrawal Flow/i));

    await waitFor(() => {
      expect(screen.getByText(/Authorize & Release On-Chain Contract Funds/i)).toBeInTheDocument();
    });

    const authorizeBtn = screen.getByText(/Authorize & Release On-Chain Contract Funds/i);
    fireEvent.click(authorizeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Releasing campaign funds on Soroban smart contract/i)).toBeInTheDocument();
    });
  });
});
