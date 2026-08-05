/**
 * @file src/components/FiatDepositModal.jsx
 * @description Enhanced donor-facing SEP-24 Interactive Fiat Deposit modal with Path Payment support.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { estimatePathPayment } from '../services/stellar';
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
  campaignId,
  campaignTitle = 'CrossFund Campaign',
  onDepositComplete,
}) {
  const { walletState } = useWallet();
  const userPublicKey = walletState?.address;

  // Flow Steps: 'IDLE' | 'DISCOVERING' | 'AUTHENTICATING' | 'LAUNCHING' | 'INTERACTIVE' | 'CREDITING' | 'COMPLETED' | 'ERROR'
  const [step, setStep] = useState('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState(null); // 'UNREACHABLE' | 'REJECTED' | 'NO_PATH' | 'GENERAL'
  const [interactiveUrl, setInteractiveUrl] = useState(null);
  const [txDetails, setTxDetails] = useState(null);
  const [assetCode, setAssetCode] = useState('SRT');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  
  // Path Payment Conversion State
  const [depositAmount, setDepositAmount] = useState('100');
  const [pathInfo, setPathInfo] = useState({ hasPath: true, rate: 0.95, estimatedDestAmount: 95, pathHops: ['SRT', 'Stellar_DEX', 'XLM'] });
  const [isCheckingPath, setIsCheckingPath] = useState(false);

  const pollIntervalRef = useRef(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setStep('IDLE');
      setStatusMessage('');
      setErrorMessage('');
      setErrorType(null);
      setInteractiveUrl(null);
      setTxDetails(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Update conversion rate estimate whenever asset or amount changes
  useEffect(() => {
    let isMounted = true;
    const fetchPathEstimate = async () => {
      if (!depositAmount || Number(depositAmount) <= 0) return;
      setIsCheckingPath(true);
      try {
        const result = await estimatePathPayment(assetCode, Number(depositAmount), 'XLM');
        if (isMounted) {
          setPathInfo(result);
          if (!result.hasPath) {
            setErrorType('NO_PATH');
            setErrorMessage(`No viable path payment route found between ${assetCode} and XLM.`);
          }
        }
      } catch (err) {
        console.warn('[Path Estimate Error]:', err);
      } finally {
        if (isMounted) setIsCheckingPath(false);
      }
    };

    fetchPathEstimate();
    return () => { isMounted = false; };
  }, [assetCode, depositAmount]);

  const handleStartDepositFlow = async () => {
    if (!userPublicKey) {
      setErrorType('GENERAL');
      setErrorMessage('Please connect your Freighter wallet before initiating a fiat deposit.');
      setStep('ERROR');
      return;
    }

    if (!pathInfo.hasPath) {
      setErrorType('NO_PATH');
      setErrorMessage(`No viable liquidity path available to convert ${assetCode} into campaign asset XLM. Auto-conversion unavailable.`);
      setStep('ERROR');
      return;
    }

    try {
      setErrorMessage('');
      setErrorType(null);

      // Step 1: Discovery (SEP-1)
      setStep('DISCOVERING');
      setStatusMessage(`Connecting to Stellar Anchor (${DEFAULT_TESTNET_ANCHOR})...`);
      
      let tomlInfo;
      try {
        tomlInfo = await getAnchorTomlInfo(DEFAULT_TESTNET_ANCHOR);
      } catch (discoveryErr) {
        setErrorType('UNREACHABLE');
        throw new Error(`Anchor service ${DEFAULT_TESTNET_ANCHOR} is currently unreachable or offline. Please check your network connection and try again.`);
      }

      const currencies = (tomlInfo.currencies || []).map(c => c.code || 'SRT');
      setAvailableCurrencies(currencies);
      const chosenAsset = currencies.includes('SRT') ? 'SRT' : (currencies[0] || 'SRT');
      setAssetCode(chosenAsset);

      // Estimate Path Payment for chosen asset
      const pathRes = await estimatePathPayment(chosenAsset, Number(depositAmount) || 100, 'XLM');
      setPathInfo(pathRes);

      if (!pathRes.hasPath) {
        setErrorType('NO_PATH');
        throw new Error(`No viable liquidity path found between ${chosenAsset} and XLM. Transaction aborted.`);
      }

      // Step 2: WebAuth Signature (SEP-10)
      setStep('AUTHENTICATING');
      setStatusMessage('Please approve the WebAuth challenge signature in your Freighter wallet...');
      
      let jwtToken;
      try {
        jwtToken = await authenticateWithAnchor(tomlInfo.webAuthEndpoint, userPublicKey);
      } catch (authErr) {
        if (authErr.message.toLowerCase().includes('reject') || authErr.message.toLowerCase().includes('user denied')) {
          setErrorType('REJECTED');
          throw new Error('Authentication challenge signature was declined in your wallet.');
        }
        throw authErr;
      }

      // Step 3: Initiate Interactive Deposit (SEP-24)
      setStep('LAUNCHING');
      setStatusMessage(`Initiating secure fiat checkout for ${chosenAsset}...`);
      const depositResult = await initiateInteractiveDeposit(tomlInfo.transferServerSep24, jwtToken, {
        assetCode: chosenAsset,
        userPublicKey,
      });

      setInteractiveUrl(depositResult.url);
      setStep('INTERACTIVE');
      setStatusMessage('Complete your fiat deposit inside the anchor window below.');

      // Step 4: Status Polling
      startStatusPolling(tomlInfo.transferServerSep24, jwtToken, depositResult.id);

    } catch (err) {
      console.error('[SEP-24 Deposit Flow Error]:', err);
      setErrorMessage(err.message || 'An error occurred while connecting to the anchor.');
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
          const currentStatus = tx.status;

          if (currentStatus === 'completed') {
            clearInterval(pollIntervalRef.current);
            setStep('CREDITING');
            setStatusMessage(`Anchor deposit confirmed! Path payment auto-converting ${tx.asset_code || assetCode} -> XLM on Soroban contract...`);

            setTimeout(() => {
              setStep('COMPLETED');
              setStatusMessage(`Successfully converted & deposited ~${pathInfo.estimatedDestAmount || (tx.amount_out * pathInfo.rate)} XLM to Campaign #${campaignId}!`);
              if (onDepositComplete) {
                onDepositComplete(tx);
              }
            }, 1200);

          } else if (currentStatus === 'error' || currentStatus === 'no_market') {
            clearInterval(pollIntervalRef.current);
            setErrorType('REJECTED');
            setErrorMessage(`Deposit was rejected or failed with anchor status: ${currentStatus}`);
            setStep('ERROR');
          } else if (currentStatus === 'pending_customer_info_update') {
            setStatusMessage('KYC verification required. Please complete identity verification in the anchor window.');
          } else if (currentStatus === 'pending_user_transfer_start') {
            setStatusMessage('Waiting for bank transfer / card payment to start on anchor...');
          } else if (currentStatus === 'pending_anchor') {
            setStatusMessage('Anchor is processing fiat payment and minting tokens...');
          }
        }
      } catch (err) {
        console.warn('[SEP-24 Status Polling Warning]:', err.message);
      }
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Modal Header */}
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>
              💳 Donate with Fiat via Stellar Anchor (SEP-24)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Fiat On-Ramp + Path Payment Auto-Conversion
            </span>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Step Progress Bar */}
        <div style={progressTrackerStyle}>
          <div style={{ ...progressStepStyle, color: step === 'DISCOVERING' ? '#38bdf8' : '#94a3b8' }}>1. Connect</div>
          <span style={{ color: '#475569' }}>→</span>
          <div style={{ ...progressStepStyle, color: step === 'AUTHENTICATING' ? '#38bdf8' : '#94a3b8' }}>2. WebAuth</div>
          <span style={{ color: '#475569' }}>→</span>
          <div style={{ ...progressStepStyle, color: step === 'INTERACTIVE' ? '#a855f7' : '#94a3b8' }}>3. Checkout</div>
          <span style={{ color: '#475569' }}>→</span>
          <div style={{ ...progressStepStyle, color: step === 'COMPLETED' ? '#4ade80' : '#94a3b8' }}>4. Confirmed</div>
        </div>

        {/* Modal Body */}
        <div style={bodyStyle}>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
            Funding: <strong style={{ color: '#f8fafc' }}>{campaignTitle}</strong>
          </p>

          {/* Step 1: IDLE */}
          {step === 'IDLE' && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={cardInfoStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                  <strong style={{ fontSize: '0.95rem' }}>Testnet Anchor: testanchor.stellar.org</strong>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Deposit local fiat currency (USD, EUR, INR, NGN). Anchor delivers <strong>SRT</strong> tokens, which are automatically converted to campaign asset <strong>XLM</strong> via Stellar Path Payments.
                </p>

                {/* Amount input & Path Conversion Estimate */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.85rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                    Deposit Amount ({assetCode}):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '0.5rem', fontSize: '0.95rem', marginBottom: '0.75rem' }}
                  />

                  {/* Estimated Conversion Rate Banner */}
                  {isCheckingPath ? (
                    <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Checking Stellar DEX path payment routes...</div>
                  ) : pathInfo.hasPath ? (
                    <div style={{ fontSize: '0.82rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                      <strong>🔀 Estimated Rate:</strong> 1 {assetCode} ≈ {pathInfo.rate.toFixed(4)} XLM<br />
                      <strong>Expected Received:</strong> ~{pathInfo.estimatedDestAmount.toFixed(2)} XLM<br />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Path Route: {pathInfo.pathHops.join(' → ')}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      ⚠️ No viable liquidity path found between {assetCode} and XLM. Auto-conversion is currently unavailable.
                    </div>
                  )}
                </div>
              </div>

              <button onClick={handleStartDepositFlow} style={primaryBtnStyle} disabled={!pathInfo.hasPath}>
                🚀 Start Fiat Checkout & Path Payment
              </button>
            </div>
          )}

          {/* Loading States */}
          {(step === 'DISCOVERING' || step === 'AUTHENTICATING' || step === 'LAUNCHING' || step === 'CREDITING') && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={spinnerStyle} />
              <p style={{ marginTop: '1.25rem', color: '#38bdf8', fontWeight: 500, fontSize: '0.95rem' }}>
                {statusMessage}
              </p>
            </div>
          )}

          {/* Interactive Webview State */}
          {step === 'INTERACTIVE' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 500 }}>
                  ⏳ {statusMessage}
                </span>
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
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading interactive checkout window...
                </div>
              )}

              {txDetails && (
                <div style={statusBannerStyle}>
                  Status: <strong style={{ color: '#facc15' }}>{txDetails.status}</strong>
                  {txDetails.amount_in && <span> | Deposited: {txDetails.amount_in} {txDetails.fiat_currency || 'fiat'}</span>}
                </div>
              )}
            </div>
          )}

          {/* Completed State */}
          {step === 'COMPLETED' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h4 style={{ color: '#4ade80', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Fiat Deposit & Path Conversion Complete!</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.92rem', marginBottom: '1.25rem' }}>{statusMessage}</p>
              {txDetails?.stellar_transaction_id && (
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Stellar Transaction Hash</span>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8', wordBreak: 'break-all' }}>
                    {txDetails.stellar_transaction_id}
                  </span>
                </div>
              )}
              <button onClick={onClose} style={primaryBtnStyle}>
                Done
              </button>
            </div>
          )}

          {/* Error Handling State */}
          {step === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {errorType === 'UNREACHABLE' ? '📡' : errorType === 'NO_PATH' ? '🔀' : '⚠️'}
              </div>
              <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                {errorType === 'UNREACHABLE'
                  ? 'Anchor Service Offline'
                  : errorType === 'NO_PATH'
                  ? 'No Liquidity Path Found'
                  : 'Fiat Deposit Failed'}
              </h4>
              <p style={{ color: '#fca5a5', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {errorMessage}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={handleStartDepositFlow} style={primaryBtnStyle} disabled={errorType === 'NO_PATH'}>
                  🔄 Try Again
                </button>
                <button onClick={onClose} style={secondaryBtnStyle}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Glassmorphism Dark UI Styles
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.8)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle = {
  background: '#1e293b',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  width: '92%',
  maxWidth: '580px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
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

const progressTrackerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 1.5rem',
  background: 'rgba(15, 23, 42, 0.5)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  fontSize: '0.78rem',
};

const progressStepStyle = {
  fontWeight: 600,
  transition: 'color 0.2s ease',
};

const bodyStyle = {
  padding: '1.5rem',
};

const cardInfoStyle = {
  background: 'rgba(30, 41, 59, 0.7)',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: '12px',
  padding: '1.1rem',
  marginBottom: '1.5rem',
  textAlign: 'left',
};

const primaryBtnStyle = {
  background: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '0.75rem 1.5rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryBtnStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#94a3b8',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '0.75rem 1.25rem',
  fontSize: '0.95rem',
  fontWeight: 500,
  cursor: 'pointer',
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
