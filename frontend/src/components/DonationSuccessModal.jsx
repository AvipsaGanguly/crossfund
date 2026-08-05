import React from 'react';

const DonationSuccessModal = ({ donation, onClose }) => {
  if (!donation) return null;

  const {
    hash,
    status = 'SUCCESS',
    ledger = 'N/A',
    timestamp = new Date().toLocaleString(),
    amountXLM,
    campaignTitle,
    donorAddress,
    explorerUrl,
  } = donation;

  const truncatedHash = hash ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : 'N/A';
  const truncatedAddress = donorAddress ? `${donorAddress.slice(0, 6)}...${donorAddress.slice(-6)}` : 'N/A';
  const finalExplorerUrl = explorerUrl || `https://stellar.expert/explorer/testnet/tx/${hash}`;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="glass animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2.5rem',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, rgba(20, 24, 40, 0.95) 0%, rgba(10, 14, 26, 0.98) 100%)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 242, 254, 0.15)',
          position: 'relative',
          color: '#fff',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '1.2rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title="Close modal"
        >
          &times;
        </button>

        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.4) 100%)',
              border: '2px solid #10b981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#10b981',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
              marginBottom: '1rem',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Donation Successful!
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
            Thank you for supporting this campaign on the Stellar network.
          </p>
        </div>

        {/* Transaction Details Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.9rem',
          }}
        >
          {/* Donated Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Donated Amount</span>
            <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
              {amountXLM} XLM
            </span>
          </div>

          {/* Campaign Name */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Campaign</span>
            <span
              style={{
                fontWeight: 600,
                color: '#f8fafc',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={campaignTitle}
            >
              {campaignTitle}
            </span>
          </div>

          {/* Donor Wallet */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Wallet Address</span>
            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }} title={donorAddress}>
              {truncatedAddress}
            </span>
          </div>

          <hr style={{ borderColor: 'rgba(255, 255, 255, 0.06)', margin: '0.25rem 0' }} />

          {/* Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Status</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#34d399',
                }}
              />
              {status}
            </span>
          </div>

          {/* Ledger Number */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Ledger #</span>
            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{ledger}</span>
          </div>

          {/* Timestamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Timestamp</span>
            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{timestamp}</span>
          </div>

          {/* Hash */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Transaction Hash</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.85rem' }} title={hash}>
              {truncatedHash}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href={finalExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderRadius: '12px',
            }}
          >
            <span>View on Stellar Expert</span>
            <span style={{ fontSize: '1.1rem' }}>↗</span>
          </a>

          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              fontSize: '0.95rem',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#cbd5e1',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationSuccessModal;
