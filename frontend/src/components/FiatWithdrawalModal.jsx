/**
 * @file src/components/FiatWithdrawalModal.jsx
 * @description Modal component for Creator Withdrawal-to-Fiat flow via SEP-24 Stellar Anchor.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCampaign } from '../hooks/useCampaign';
import {
  getAnchorTomlInfo,
  authenticateWithAnchor,
  initiateInteractiveWithdrawal,
  getDepositTransactionStatus,
  DEFAULT_TESTNET_ANCHOR,
} from '../services/anchorService';

export default function FiatWithdrawalModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle = 'CrossFund Campaign',
  raisedAmount = 0,
  onWithdrawComplete,
}) {
  const { walletState } = useWallet();
  const userPublicKey = walletState?.address;
  const { withdraw } = useCampaign();

  // Steps: 'IDLE' | 'DISCOVERING' | 'AUTHENTICATING' | 'LAUNCHING' | 'INTERACTIVE' | 'ONCHAIN_WITHDRAW' | 'POLLING' | 'COMPLETED' | 'ERROR'
  const [step, setStep] = useState('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [interactiveUrl, setInteractiveUrl] = useState(null);
  const [txDetails, setTxDetails] = useState(null);

  const pollIntervalRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleStartWithdrawalFlow = async () => {
    if (!userPublicKey) {
      setErrorMessage('Please connect your creator wallet before initiating a bank withdrawal.');
      setStep('ERROR');
      return;
    }

    if (Number(raisedAmount) <= 0) {
      setErrorMessage('Insufficient campaign balance available for withdrawal.');
      setStep('ERROR');
      return;
    }

    try {
      setErrorMessage('');

      // 1. Discovery (SEP-1)
      setStep('DISCOVERING');
      setStatusMessage(`Connecting to Anchor (${DEFAULT_TESTNET_ANCHOR})...`);
      
      let tomlInfo;
      try {
        tomlInfo = await getAnchorTomlInfo(DEFAULT_TESTNET_ANCHOR);
      } catch (err) {
        throw new Error(`Anchor service ${DEFAULT_TESTNET_ANCHOR} is currently offline or unreachable.`);
      }

      // 2. Authentication (SEP-10)
      setStep('AUTHENTICATING');
      setStatusMessage('Please approve the WebAuth challenge signature in your Freighter wallet...');
      const jwtToken = await authenticateWithAnchor(tomlInfo.webAuthEndpoint, userPublicKey);

      // 3. Initiate Interactive Withdrawal (SEP-24)
      setStep('LAUNCHING');
      setStatusMessage('Opening secure bank account setup window...');
      const withdrawResult = await initiateInteractiveWithdrawal(tomlInfo.transferServerSep24, jwtToken, {
        assetCode: 'SRT',
        userPublicKey,
      });

      setInteractiveUrl(withdrawResult.url);
      setStep('INTERACTIVE');
      setStatusMessage('Provide your bank details (IBAN / Account Number) in the anchor window below.');

      // 4. Start Polling & On-Chain Settlement Trigger
      startWithdrawalPolling(tomlInfo.transferServerSep24, jwtToken, withdrawResult.id);

    } catch (err) {
      console.error('[SEP-24 Withdrawal Flow Error]:', err);
      setErrorMessage(err.message || 'Failed to initiate withdrawal to bank.');
      setStep('ERROR');
    }
  };

  const handleOnChainRelease = async () => {
    try {
      setStep('ONCHAIN_WITHDRAW');
      setStatusMessage('Releasing campaign funds on Soroban smart contract to anchor...');
      await withdraw(campaignId);
      setStatusMessage('On-chain funds released! Anchor is processing bank payout...');
      setStep('POLLING');
    } catch (err) {
      console.error('[On-Chain Release Error]:', err);
      setErrorMessage(err.message || 'Failed to execute on-chain contract withdrawal.');
      setStep('ERROR');
    }
  };

  const startWithdrawalPolling = (transferServer, jwtToken, transactionId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const tx = await getDepositTransactionStatus(transferServer, jwtToken, transactionId);
        if (tx) {
          setTxDetails(tx);
          const currentStatus = tx.status;

          if (currentStatus === 'completed') {
            clearInterval(pollIntervalRef.current);
            setStep('COMPLETED');
            setStatusMessage(`Withdrawal Completed! ${tx.amount_in || raisedAmount} SRT transferred to bank account.`);
            if (onWithdrawComplete) {
              onWithdrawComplete(tx);
            }
          } else if (currentStatus === 'error' || currentStatus === 'no_market') {
            clearInterval(pollIntervalRef.current);
            setErrorMessage(`Bank withdrawal failed with anchor status: ${currentStatus}`);
            setStep('ERROR');
          } else if (currentStatus === 'pending_anchor') {
            setStatusMessage('Processing: Anchor is transferring funds to your bank account...');
          } else if (currentStatus === 'pending_user_transfer_start') {
            setStatusMessage('Withdrawal Initiated: Authorized bank payout details with anchor.');
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
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>
              🏛️ Creator Withdrawal to Bank Account
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              SEP-24 Interactive Fiat Off-Ramp
            </span>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={bodyStyle}>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Campaign: <strong style={{ color: '#f8fafc' }}>{campaignTitle}</strong>
          </p>
          <p style={{ color: '#38bdf8', fontSize: '0.9rem', margin: '0 0 1.25rem 0', fontWeight: 600 }}>
            Available Raised Funds: {raisedAmount} XLM / SRT
          </p>

          {step === 'IDLE' && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={cardInfoStyle}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Bank Off-Ramp via testanchor.stellar.org</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Withdraw your raised campaign funds directly into your local bank account. 
                  The anchor opens a secure hosted UI to register your payout bank account.
                </p>
              </div>

              <button onClick={handleStartWithdrawalFlow} style={primaryBtnStyle}>
                🏦 Start Bank Withdrawal Flow
              </button>
            </div>
          )}

          {(step === 'DISCOVERING' || step === 'AUTHENTICATING' || step === 'LAUNCHING' || step === 'ONCHAIN_WITHDRAW' || step === 'POLLING') && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={spinnerStyle} />
              <p style={{ marginTop: '1.25rem', color: '#38bdf8', fontWeight: 500, fontSize: '0.95rem' }}>
                {statusMessage}
              </p>
            </div>
          )}

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
                  title="Stellar Anchor SEP-24 Interactive Withdrawal"
                  style={iframeStyle}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading bank payout window...
                </div>
              )}

              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button onClick={handleOnChainRelease} style={successBtnStyle}>
                  🔓 Authorize & Release On-Chain Contract Funds
                </button>
              </div>
            </div>
          )}

          {step === 'COMPLETED' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h4 style={{ color: '#4ade80', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Withdrawal Completed!</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.92rem', marginBottom: '1.25rem' }}>{statusMessage}</p>
              <button onClick={onClose} style={primaryBtnStyle}>
                Done
              </button>
            </div>
          )}

          {step === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Withdrawal Failed</h4>
              <p style={{ color: '#fca5a5', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {errorMessage}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={handleStartWithdrawalFlow} style={primaryBtnStyle}>
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

// Inline Styles
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

const successBtnStyle = {
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '0.75rem 1.25rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
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
  height: '400px',
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
