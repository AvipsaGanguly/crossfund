import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../components/CampaignCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWallet } from '../hooks/useWallet';
import { useCampaign } from '../hooks/useCampaign';
import { LoadingSkeleton } from '../components/LoadingSpinner';
import FiatWithdrawalModal from '../components/FiatWithdrawalModal';

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  const { address, activeWallet, disconnect, isConnected, setIsModalOpen } = useWallet();
  const { getAllCampaigns, withdraw, loading } = useCampaign();
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [selectedWithdrawCampaign, setSelectedWithdrawCampaign] = useState(null);
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    const loadUserCampaigns = async () => {
      const all = await getAllCampaigns();
      if (address && all) {
        const filtered = all.filter(c => c.owner && String(c.owner) === String(address));
        setUserCampaigns(filtered.length > 0 ? filtered : all); // Show all if none owned
      } else {
        setUserCampaigns(all || []);
      }
    };
    loadUserCampaigns();
  }, [address, getAllCampaigns]);

  const truncatedAddress = address 
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
    : 'Not Connected';

  const handleDirectWithdraw = async (campaignId) => {
    try {
      setActionStatus(`Processing on-chain contract withdrawal for Campaign #${campaignId}...`);
      await withdraw(campaignId);
      setActionStatus(`Successfully withdrew campaign #${campaignId} funds on-chain!`);
      const all = await getAllCampaigns();
      if (all) setUserCampaigns(all);
    } catch (err) {
      console.error('Direct withdrawal error:', err);
      setActionStatus(`Withdrawal Error: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* SEP-24 Bank Withdrawal Modal */}
      {selectedWithdrawCampaign && (
        <FiatWithdrawalModal
          isOpen={Boolean(selectedWithdrawCampaign)}
          onClose={() => setSelectedWithdrawCampaign(null)}
          campaignId={selectedWithdrawCampaign.id}
          campaignTitle={selectedWithdrawCampaign.title}
          raisedAmount={selectedWithdrawCampaign.raised}
          onWithdrawComplete={async () => {
            const all = await getAllCampaigns();
            if (all) setUserCampaigns(all);
          }}
        />
      )}

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Dashboard</h2>

      {actionStatus && (
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', color: '#38bdf8', fontSize: '0.9rem' }}>
          {actionStatus}
        </div>
      )}
      
      <div className="dashboard-grid">
        <aside>
          <div className="glass wallet-card">
            <h3>Your Wallet</h3>
            <div className="wallet-address">{truncatedAddress}</div>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <strong style={{ color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {isConnected ? `Connected (${activeWallet})` : 'Disconnected'}
              </strong>
            </div>
            {isConnected ? (
              <button className="btn btn-outline" style={{width: '100%'}} onClick={disconnect}>
                Disconnect
              </button>
            ) : (
              <button className="btn btn-primary" style={{width: '100%'}} onClick={() => setIsModalOpen(true)}>
                Connect Wallet
              </button>
            )}
          </div>
        </aside>
        
        <main>
          <h3 style={{ marginBottom: '1rem' }}>Your Campaigns</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {loading ? (
              <LoadingSkeleton height="300px" />
            ) : (
              userCampaigns.map((c, idx) => {
                const id = c.id !== undefined && c.id !== null ? String(c.id) : String(idx + 1);
                const title = c.title ? String(c.title) : 'My Project';
                const desc = c.description && String(c.description).trim() !== '' ? String(c.description) : 'No description provided.';
                const goal = c.goal !== undefined && c.goal !== null ? Number(c.goal) / 10000000 : 1000;
                const deadline = c.deadline ? Number(c.deadline) : Date.now() / 1000 + 30 * 86400;
                const daysLeft = Math.max(0, Math.floor((deadline - Date.now() / 1000) / 86400));
                const raisedStroops = c.raised !== undefined && c.raised !== null ? Number(c.raised) : 0;
                const raised = raisedStroops / 10000000;

                return (
                  <div key={id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <CampaignCard 
                      id={id} 
                      title={title} 
                      desc={desc} 
                      raised={raised} 
                      goal={goal} 
                      daysLeft={daysLeft} 
                      image={c.image || c.imageUrl}
                    />

                    {/* Creator Withdrawal Control Panel */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '0 0 16px 16px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '-8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Creator Payout Options
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleDirectWithdraw(id)}
                          disabled={raised < goal}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: raised >= goal ? '#38bdf8' : '#64748b',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.25rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: raised >= goal ? 'pointer' : 'not-allowed',
                          }}
                        >
                          ⚡ On-Chain
                        </button>
                        <button
                          onClick={() => setSelectedWithdrawCampaign({ id, title, raised })}
                          disabled={raised <= 0}
                          style={{
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem 0.25rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: raised > 0 ? 'pointer' : 'not-allowed',
                            boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
                          }}
                        >
                          🏦 Withdraw Bank
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <Link to="/create-campaign" className="glass campaign-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', textDecoration: 'none' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>+ Create New</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
