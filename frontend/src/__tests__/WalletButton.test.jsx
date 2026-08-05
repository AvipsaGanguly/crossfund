import { render, screen, fireEvent } from '@testing-library/react';
import WalletButton from '../components/WalletButton';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockDisconnect = vi.fn();
const mockSwitchWallet = vi.fn();
const mockSetIsModalOpen = vi.fn();
let mockAddress = '';
let mockIsConnecting = false;

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    address: mockAddress,
    isConnecting: mockIsConnecting,
    disconnect: mockDisconnect,
    switchWallet: mockSwitchWallet,
    setIsModalOpen: mockSetIsModalOpen,
  }),
}));

describe('WalletButton Component', () => {
  beforeEach(() => {
    mockAddress = '';
    mockIsConnecting = false;
    vi.clearAllMocks();
  });

  it('renders Connect Wallet button when disconnected', () => {
    render(<WalletButton />);
    const button = screen.getByRole('button', { name: /Connect your Stellar Wallet/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(true);
  });

  it('renders Connecting state when isConnecting is true', () => {
    mockIsConnecting = true;
    render(<WalletButton />);
    expect(screen.getByText(/Connecting\.\.\./i)).toBeInTheDocument();
  });

  it('renders address, Switch Wallet, and Disconnect buttons when connected', () => {
    mockAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    render(<WalletButton />);

    expect(screen.getByText(/GAAAA\.\.\.AWHF/i)).toBeInTheDocument();

    const switchBtn = screen.getByRole('button', { name: /Switch Wallet/i });
    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });

    expect(switchBtn).toBeInTheDocument();
    expect(disconnectBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);
    expect(mockSwitchWallet).toHaveBeenCalled();

    fireEvent.click(disconnectBtn);
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
