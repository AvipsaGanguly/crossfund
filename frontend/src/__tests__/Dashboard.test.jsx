import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    activeWallet: 'freighter',
    disconnect: vi.fn(),
    isConnected: true,
    setIsModalOpen: vi.fn()
  })
}));

vi.mock('../hooks/useCampaign', () => ({
  useCampaign: () => ({
    getAllCampaigns: vi.fn(async () => []),
    loading: false
  })
}));

describe('Dashboard', () => {
  it('renders dashboard sections', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    expect(screen.getByText(/Your Wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Campaigns/i)).toBeInTheDocument();
  });
});
