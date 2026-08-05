import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './useToast';
import {
  connectWallet as connectWalletService,
  disconnectWallet as disconnectWalletService,
  switchWallet as switchWalletService,
  getActiveWallet,
  isWalletConnected,
  signTransaction as signTxService,
} from '../services/wallet';

const WalletContext = createContext();

export const SUPPORTED_WALLET_LIST = [
  { id: 'freighter', name: 'Freighter' },
  { id: 'xbull', name: 'xBull' },
  { id: 'albedo', name: 'Albedo' },
  { id: 'lobstr', name: 'Lobstr' },
  { id: 'rabet', name: 'Rabet' },
];

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState('');
  const [activeWallet, setActiveWallet] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  /**
   * Connects to a wallet.
   * If walletId is null/undefined, calls connectWalletService(null) which triggers
   * StellarWalletsKit.authModal().
   * If walletId is specified, connects directly to that wallet module and requests access.
   */
  const connect = async (walletId = null) => {
    setIsConnecting(true);
    try {
      const res = await connectWalletService(walletId);
      setAddress(res.address);
      setActiveWallet(res.walletId);
      setIsModalOpen(false);
      if (addToast) addToast(`Connected to ${res.walletId}!`, 'success');
      return res;
    } catch (err) {
      console.error('Wallet connection error:', err);
      if (addToast) addToast(err.message || 'Failed to connect wallet.', 'error');
      // Clean up local state on failure
      disconnectWalletService();
      setAddress('');
      setActiveWallet('');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnects current wallet and clears in-memory state completely.
   */
  const disconnect = useCallback(() => {
    disconnectWalletService();
    setAddress('');
    setActiveWallet('');
    setIsModalOpen(false);
    if (addToast) addToast('Wallet disconnected.', 'info');
  }, [addToast]);

  /**
   * Switches wallet session.
   * Disconnects current state, clears session, and opens wallet selection modal
   * or connects directly to newWalletId if provided.
   */
  const switchWallet = useCallback(async (newWalletId = null) => {
    disconnectWalletService();
    setAddress('');
    setActiveWallet('');

    if (newWalletId) {
      return await connect(newWalletId);
    } else {
      setIsModalOpen(true);
    }
  }, [addToast]);

  /**
   * Signs a transaction XDR with the active wallet.
   */
  const signTransaction = async (xdr, opts) => {
    if (!isWalletConnected() && !address) {
      if (addToast) addToast('Wallet not connected', 'error');
      throw new Error('Wallet not connected');
    }
    try {
      const result = await signTxService(xdr, opts);
      return result;
    } catch (err) {
      if (addToast) addToast(err.message || 'Transaction signing failed', 'error');
      throw err;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        activeWallet,
        isConnecting,
        isConnected: Boolean(address),
        connect,
        disconnect,
        switchWallet,
        signTransaction,
        isModalOpen,
        setIsModalOpen,
        supportedWallets: SUPPORTED_WALLET_LIST,
        getActiveWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
