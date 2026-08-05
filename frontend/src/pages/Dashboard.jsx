import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../components/CampaignCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWallet } from '../hooks/useWallet';
import { useCampaign } from '../hooks/useCampaign';
import { LoadingSkeleton } from '../components/LoadingSpinner';

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  const { address, activeWallet, disconnect, isConnected, setIsModalOpen } = useWallet();
  const { getAllCampaigns, loading } = useCampaign();
  const [userCampaigns, setUserCampaigns] = useState([]);

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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Dashboard</h2>
      
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                  <CampaignCard 
                    key={id}
                    id={id} 
                    title={title} 
                    desc={desc} 
                    raised={raised} 
                    goal={goal} 
                    daysLeft={daysLeft} 
                    image={c.image || c.imageUrl}
                  />
                );
              })
            )}

            <Link to="/create-campaign" className="glass campaign-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textDecoration: 'none' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>+ Create New</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
