import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaign } from '../hooks/useCampaign';
import { useWallet } from '../hooks/useWallet';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ProgressBar from '../components/ProgressBar';
import { LoadingSkeleton } from '../components/LoadingSpinner';
import DonationSuccessModal from '../components/DonationSuccessModal';

const CampaignDetails = () => {
  const { id } = useParams();
  useDocumentTitle(`Campaign #${id}`);
  const { getCampaign, donate, loading: isDonating } = useCampaign();
  const { isConnected, address, setIsModalOpen } = useWallet();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [latestDonation, setLatestDonation] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationError, setDonationError] = useState(null);

  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      try {
        const data = await getCampaign(id);
        setCampaign(data);
      } catch (err) {
        console.error('Failed to load campaign:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCampaign();
  }, [id, getCampaign]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!donationAmount || Number(donationAmount) <= 0) return;

    setDonationError(null);
    try {
      const stroopAmount = Number(donationAmount) * 10000000;
      const res = await donate(id, stroopAmount);

      const donationData = {
        hash: res?.hash || '',
        status: res?.status || 'SUCCESS',
        ledger: res?.ledger || 'N/A',
        timestamp: res?.timestamp || new Date().toLocaleString(),
        amountXLM: donationAmount,
        campaignTitle: campaign?.title ? String(campaign.title) : `Campaign #${id}`,
        donorAddress: address || res?.donorAddress || 'N/A',
        explorerUrl: res?.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${res?.hash}`,
      };

      setLatestDonation(donationData);
      setShowSuccessModal(true);
      setDonationAmount('');

      // Reload campaign details
      const updated = await getCampaign(id);
      if (updated) setCampaign(updated);
    } catch (err) {
      console.error('Donation error:', err);
      const errMsg = err?.message || 'Transaction failed. Please try again.';
      setDonationError(errMsg);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem 5%', maxWidth: '800px', margin: '0 auto' }}>
        <LoadingSkeleton height="400px" />
      </div>
    );
  }

  const title = campaign?.title ? String(campaign.title) : `Campaign #${id}`;
  const desc = campaign?.description && String(campaign.description).trim() !== ''
    ? String(campaign.description)
    : 'No description provided.';
  const goal = campaign?.goal !== undefined && campaign.goal !== null ? Number(campaign.goal) / 10000000 : 1000;
  const deadline = campaign?.deadline ? Number(campaign.deadline) : Date.now() / 1000 + 30 * 86400;
  const daysLeft = Math.max(0, Math.floor((deadline - Date.now() / 1000) / 86400));
  const raisedStroops = campaign?.raised !== undefined && campaign?.raised !== null ? Number(campaign.raised) : 0;
  const raised = raisedStroops / 10000000;
  const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const imageUrl = campaign?.image || campaign?.imageUrl;
  const hasImage = Boolean(imageUrl && String(imageUrl).trim() !== '');

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 5%', maxWidth: '900px', margin: '0 auto' }}>
      {/* Donation Success Modal */}
      {showSuccessModal && (
        <DonationSuccessModal
          donation={latestDonation}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <Link to="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Campaigns
      </Link>

      <div className="glass" style={{ padding: '2rem', marginTop: '1rem' }}>
        {hasImage && (
          <div style={{ width: '100%', maxHeight: '350px', overflow: 'hidden', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <h2 className="section-title" style={{ marginTop: 0, textAlign: 'left', paddingLeft: 0 }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>{desc}</p>

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="card-stats" style={{ marginBottom: '0.5rem' }}>
            <span><strong>{raised} XLM</strong> raised of {goal} XLM goal</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar progress={progress} />
          <div className="card-stats" style={{ marginTop: '0.5rem' }}>
            <span>Category: {campaign?.category ? String(campaign.category) : 'General'}</span>
            <span>{daysLeft} days remaining</span>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '2rem 0' }} />

        {/* Latest Donation Persistent Receipt Card */}
        {latestDonation && (
          <div
            className="animate-fade-in"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>✓</span> Your Latest Contribution
              </span>
              <button
                onClick={() => setShowSuccessModal(true)}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: '8px' }}
              >
                View Full Receipt
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Amount</span>
                <strong>{latestDonation.amountXLM} XLM</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Transaction Hash</span>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                  {latestDonation.hash ? `${latestDonation.hash.slice(0, 6)}...${latestDonation.hash.slice(-6)}` : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Ledger #</span>
                <span style={{ fontFamily: 'monospace' }}>{latestDonation.ledger}</span>
              </div>
            </div>
          </div>
        )}

        <h3 style={{ marginBottom: '1rem' }}>Support this Campaign</h3>

        {/* Failure Graceful Error Banner */}
        {donationError && (
          <div
            className="animate-fade-in"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              color: '#f87171',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Transaction Failed</strong>
              <span>{donationError}</span>
            </div>
            <button
              onClick={() => setDonationError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
            >
              &times;
            </button>
          </div>
        )}

        {isConnected ? (
          <form onSubmit={handleDonate} style={{ display: 'flex', gap: '1rem', maxWidth: '500px' }}>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Amount in XLM"
              required
              value={donationAmount}
              className="input-field"
              style={{ flex: 1 }}
              onChange={(e) => setDonationAmount(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={isDonating}>
              {isDonating ? 'Donating...' : 'Donate Now'}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Please connect your Stellar wallet to contribute.</p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Connect Wallet to Donate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetails;

