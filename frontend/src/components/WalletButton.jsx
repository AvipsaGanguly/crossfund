import React from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletButton = () => {
  const { address, isConnecting, disconnect, switchWallet, setIsModalOpen } = useWallet();

  if (isConnecting) {
    return (
      <button className="btn btn-outline" disabled>
        Connecting...
      </button>
    );
  }

  if (address) {
    const truncated = `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;

    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
          }}
          title="Connected Wallet Address"
        >
          {truncated}
        </span>
        <button
          className="btn btn-primary"
          onClick={() => switchWallet()}
          title="Disconnect current wallet and open wallet selector"
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          Switch Wallet
        </button>
        <button
          className="btn btn-outline"
          onClick={disconnect}
          title="Disconnect current wallet session"
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: '#ff4d4f', color: '#ff4d4f' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-primary"
      aria-label="Connect your Stellar Wallet"
      onClick={() => setIsModalOpen(true)}
      style={{ animation: 'pulse-glow 2s infinite' }}
    >
      Connect Wallet
    </button>
  );
};

export default WalletButton;
