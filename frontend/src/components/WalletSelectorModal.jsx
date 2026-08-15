import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { Spinner } from './LoadingSpinner';

const WalletSelectorModal = () => {
  const { isModalOpen, setIsModalOpen, connect, isConnecting, supportedWallets, installUrl } = useWallet();

  if (!isModalOpen) return null;

  return (
    <div className="modal-backdrop" onClick={() => !isConnecting && setIsModalOpen(false)}>
      <div className="modal-content glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Connect Wallet</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          Select a wallet extension to authorize connection
        </p>

        {installUrl && (
          <div style={{ padding: '0.75rem', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#ffc107' }}>
              Freighter extension is not installed.
            </p>
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4dabf7', fontWeight: '600', fontSize: '0.85rem' }}
            >
              Click here to install Freighter ↗
            </a>
          </div>
        )}

        {/* Direct Freighter Connect Button */}
        <button
          className="btn btn-primary"
          onClick={() => connect('freighter')}
          disabled={isConnecting}
          style={{
            width: '100%',
            marginBottom: '1.25rem',
            padding: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {isConnecting ? (
            <>
              <Spinner size="18px" color="#fff" />
              <span>Connecting to Wallet...</span>
            </>
          ) : (
            'Connect Freighter Wallet ↗'
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '0.5rem' }}>
          <hr style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR SELECT DIRECTLY</span>
          <hr style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {(supportedWallets || []).map((wallet) => {
            const walletId = typeof wallet === 'string' ? wallet : wallet.id;
            const walletName = typeof wallet === 'string' ? (wallet.charAt(0).toUpperCase() + wallet.slice(1)) : (wallet.name || wallet.id);

            return (
              <button
                key={walletId}
                className="btn btn-outline"
                onClick={() => connect(walletId)}
                disabled={isConnecting}
                style={{ justifyContent: 'space-between', textTransform: 'capitalize', padding: '0.75rem 1rem' }}
              >
                <span>{walletName}</span>
                {isConnecting && <span className="skeleton" style={{ width: '18px', height: '18px', borderRadius: '50%' }}></span>}
              </button>
            );
          })}
        </div>

        <button
          className="btn btn-outline"
          style={{ marginTop: '1.5rem', width: '100%', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
          onClick={() => setIsModalOpen(false)}
          disabled={isConnecting}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WalletSelectorModal;
