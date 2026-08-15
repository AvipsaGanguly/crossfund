import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { Spinner } from './LoadingSpinner';

const WalletButton = () => {
  const { address, isConnecting, disconnect, switchWallet, setIsModalOpen, connect, installUrl } = useWallet();

  if (isConnecting) {
    return (
      <button className="btn btn-outline" disabled style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Spinner size="16px" color="var(--accent-cyan)" />
        <span>Connecting...</span>
      </button>
    );
  }

  if (address) {
    const truncated = `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;

    return (
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '0.4rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
          }}
          title="Connected Wallet Address"
        >
          {truncated}
        </span>
        <button
          className="btn btn-primary"
          onClick={() => switchWallet()}
          title="Disconnect current wallet and open wallet selector"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
        >
          Switch Wallet
        </button>
        <button
          className="btn btn-outline"
          onClick={disconnect}
          title="Disconnect current wallet session"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', borderColor: '#ff4d4f', color: '#ff4d4f' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  const handleConnect = async () => {
    if (setIsModalOpen) setIsModalOpen(true);
    if (typeof connect === 'function') {
      try {
        await connect('freighter');
      } catch (err) {
        // Error toast handled in useWallet hook
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        className="btn btn-primary"
        aria-label="Connect your Stellar Wallet"
        onClick={handleConnect}
        style={{ animation: 'pulse-glow 2s infinite', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
      >
        Connect Wallet
      </button>
      {installUrl && (
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{
            textDecoration: 'none',
            color: '#ffc107',
            borderColor: '#ffc107',
            fontSize: '0.8rem',
            padding: '0.45rem 0.65rem',
          }}
          title="Install Freighter Wallet Extension"
        >
          Install Freighter ↗
        </a>
      )}
    </div>
  );
};

export default WalletButton;
