import React from 'react';
import { useEvents } from '../hooks/useEvents';

const LiveFeed = () => {
  const { events } = useEvents();

  const renderEventMessage = (evt) => {
    if (evt.type === 'DonationReceived') {
      return `🎉 Someone donated ${Number(evt.data.amount) / 10000000} XLM to Campaign #${evt.data.campaignId}`;
    }
    if (evt.type === 'CampaignCreated') {
      return `🚀 New Campaign Created: #${evt.data.campaignId}`;
    }
    return `⚡ Smart Contract Event Emitted`;
  };

  // Only show the 3 most recent events
  const displayEvents = events.slice(0, 3);

  if (displayEvents.length === 0) return null;

  return (
    <div className="live-feed-container glass">
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
        🔴 Live Feed
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="live-feed-item animate-slide-up">
            {renderEventMessage(evt)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(LiveFeed);
