/**
 * @file src/components/FiatDepositModal.jsx
 * @description Modal component for Stellar SEP-24 Interactive Fiat Deposit flow in CrossFund.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import {
  getAnchorTomlInfo,
  authenticateWithAnchor,
  initiateInteractiveDeposit,
  getDepositTransactionStatus,
  DEFAULT_TESTNET_ANCHOR,
} from '../services/anchorService';

export default function FiatDepositModal({
  isOpen,
  onClose,
  campaignTitle = 'CrossFund Campaign',
  onDepositComplete,
}) {
  const { walletState } = useWallet();
  const userPublicKey = walletState?.address;

  // Flow State: 'IDLE' | 'DISCOVERING' | 'AUTHENTICATING' | 'LAUNCHING' | 'INTERACTIVE' | 'POLLING' | 'COMPLETED' | 'ERROR'
  const [step, setStep] = useState('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [interactiveUrl, setInteractiveUrl] = useState(null);
  const [txDetails, setTxDetails] = useState(null);
  const [assetCode, setAssetCode] = useState('SRT');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  const pollIntervalRef = useRef(null);

  // Clear state on modal close/open
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setStep('IDLE');
      setStatusMessage('');
      setErrorMessage('');
      setInteractiveUrl(null);
      setTxDetails(null);
    }
  }, [isOpen]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleStartDepositFlow = async () => {
    if (!userPublicKey) {
      setErrorMessage('Please connect your Stellar wallet (e.g. Freighter) before initiating a fiat deposit.');
      setStep('ERROR');
      return;
    }

    try {
      setErrorMessage('');
      // 1. Discovery (SEP-1)
      setStep('DISCOVERING');
      setStatusMessage(`Fetching anchor configurations from ${DEFAULT_TESTNET_ANCHOR}...`);
      const tomlInfo = await getAnchorTomlInfo(DEFAULT_TESTNET_ANCHOR);

      const currencies = tomlInfo.currencies.map(c => c.code || 'SRT');
      setAvailableCurrencies(currencies);
      const chosenAsset = currencies.includes('SRT') ? 'SRT' : (currencies[0] || 'SRT');
      setAssetCode(chosenAsset);

      // 2. Authentication (SEP-10)
      setStep('AUTHENTICATING');
      setStatusMessage('Please approve the WebAuth challenge signature in your Freighter wallet...');
      const jwtToken = await authenticateWithAnchor(tomlInfo.webAuthEndpoint, userPublicKey);

      // 3. Initiate Interactive Deposit (SEP-24)
      setStep('LAUNCHING');
      setStatusMessage(`Requesting interactive deposit for ${chosenAsset}...`);
      const depositResult = await initiateInteractiveDeposit(tomlInfo.transferServerSep24, jwtToken, {
        assetCode: chosenAsset,
        userPublicKey,
      });

      setInteractiveUrl(depositResult.url);
      setStep('INTERACTIVE');
      setStatusMessage('Complete your deposit in the anchor web view window below.');

      // 4. Start Polling Status
      startStatusPolling(tomlInfo.transferServerSep24, jwtToken, depositResult.id);

    } catch (err) {
      console.error('[SEP-24 Deposit Error]:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during the fiat deposit flow.');
      setStep('ERROR');
    }
  };

  const startStatusPolling = (transferServer, jwtToken, transactionId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const tx = await getDepositTransactionStatus(transferServer, jwtToken, transactionId);
        if (tx) {
          setTxDetails(tx);
          if (tx.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setStep('COMPLETED');
            setStatusMessage(`Successfully received ${tx.amount_out || ''} ${tx.asset_code || assetCode} from anchor!`);
            if (onDepositComplete) {
              onDepositComplete(tx);
            }
          } else if (tx.status === 'error' || tx.status === 'no_market') {
            clearInterval(pollIntervalRef.current);
            setStep('ERROR');
            setErrorMessage(`Deposit failed with anchor status: ${tx.status}`);
          }
        }
      } catch (err) {
        console.warn('[SEP-24 Polling Warning]:', err.message);
      }
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            💳 Donate with Fiat via Stellar Anchor (SEP-24)
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={bodyStyle}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Campaign: <strong style={{ color: '#f8fafc' }}>{campaignTitle}</strong>
          </p>

          {step === 'IDLE' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={cardInfoStyle}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Anchor: testanchor.stellar.org</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Converts local fiat (USD/EUR/INR/NGN) directly into testnet <strong>SRT</strong> tokens to fund campaigns.
                </p>
              </div>

              <button onClick={handleStartDepositFlow} style={primaryBtnStyle}>
                🚀 Start Fiat Checkout
              </button>
            </div>
          )}

          {(step === 'DISCOVERING' || step === 'AUTHENTICATING' || step === 'LAUNCHING') && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={spinnerStyle} />
              <p style={{ marginTop: '1rem', color: '#38bdf8', fontWeight: 500 }}>{statusMessage}</p>
            </div>
          )}

          {step === 'INTERACTIVE' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>⏳ {statusMessage}</span>
                {interactiveUrl && (
                  <a
                    href={interactiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.8rem', color: '#a855f7', textDecoration: 'underline' }}
                  >
                    Open in new tab ↗
                  </a>
                )}
              </div>

              {interactiveUrl ? (
                <iframe
                  src={interactiveUrl}
                  title="Stellar Anchor SEP-24 Interactive Deposit"
                  style={iframeStyle}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading interactive window...</div>
              )}

              {txDetails && (
                <div style={statusBannerStyle}>
                  Anchor Status: <strong style={{ color: '#facc15' }}>{txDetails.status}</strong>
                </div>
              )}
            </div>
          )}

          {step === 'COMPLETED' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h4 style={{ color: '#4ade80', margin: '0 0 0.5rem 0' }}>Fiat Deposit Complete!</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{statusMessage}</p>
              {txDetails?.stellar_transaction_id && (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                  Stellar Tx Hash: {txDetails.stellar_transaction_id}
                </p>
              )}
              <button onClick={onClose} style={primaryBtnStyle}>
                Done
              </button>
            </div>
          )}

          {step === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0' }}>Deposit Failed</h4>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{errorMessage}</p>
              <button onClick={handleStartDepositFlow} style={primaryBtnStyle}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Styles matching dark modern glassmorphism UI
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle = {
  background: '#1e293b',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  width: '90%',
  maxWidth: '560px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden',
  color: '#f8fafc',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.25rem',
  cursor: 'pointer',
};

const bodyStyle = {
  padding: '1.5rem',
};

const cardInfoStyle = {
  background: 'rgba(30, 41, 59, 0.7)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '12px',
  padding: '1rem',
  marginBottom: '1.5rem',
  textAlign: 'left',
};

const primaryBtnStyle = {
  background: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.15s ease',
};

const iframeStyle = {
  width: '100%',
  height: '420px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  background: '#ffffff',
};

const spinnerStyle = {
  display: 'inline-block',
  width: '36px',
  height: '36px',
  border: '3px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '50%',
  borderTopColor: '#38bdf8',
  animation: 'spin 1s ease-in-out infinite',
};

const statusBannerStyle = {
  marginTop: '0.75rem',
  padding: '0.5rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  textAlign: 'center',
};
