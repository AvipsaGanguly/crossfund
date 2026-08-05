import React, { useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import StatsCard from '../components/StatsCard';
import CampaignCard from '../components/CampaignCard';
import { fetchAllCampaigns } from '../services/campaign';
import { LoadingSkeleton } from '../components/LoadingSpinner';

const Home = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchAllCampaigns();
        setCampaigns(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="animate-fade-in">
      <HeroSection />
      
      <div style={{ padding: '0 5%', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <StatsCard label="Active Projects" value={campaigns.length.toString()} />
        </div>
      </div>

      <h2 className="section-title">Trending Campaigns</h2>
      <div className="grid-container">
        {loading ? (
          <>
            <LoadingSkeleton height="350px" />
            <LoadingSkeleton height="350px" />
            <LoadingSkeleton height="350px" />
          </>
        ) : campaigns.length === 0 ? (
          <p style={{padding: '0 5%', color: 'var(--text-muted)'}}>No campaigns found yet.</p>
        ) : (
          campaigns.map((c, idx) => {
            const id = c.id !== undefined && c.id !== null ? String(c.id) : String(idx + 1);
            const title = c.title ? String(c.title) : 'Untitled Campaign';
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
      </div>
    </div>
  );
};

export default Home;
