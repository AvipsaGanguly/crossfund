import React, { useState, useEffect } from 'react';
import { getStoredFeedback, FEEDBACK_STORAGE_KEY } from '../components/FeedbackWidget';

export default function FeedbackAdmin() {
  const [feedbackList, setFeedbackList] = useState([]);

  const loadFeedback = () => {
    const data = getStoredFeedback();
    setFeedbackList(data);
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stored feedback responses?')) {
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
      setFeedbackList([]);
    }
  };

  const totalCount = feedbackList.length;
  const avgRating = totalCount > 0
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalCount).toFixed(1)
    : 'N/A';
  const recommendPercent = totalCount > 0
    ? Math.round((feedbackList.filter((f) => f.wouldRecommend).length / totalCount) * 100)
    : 0;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 User Feedback Admin Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Review real-time in-app feedback submitted by CrossFund users.
          </p>
        </div>
        {totalCount > 0 && (
          <button onClick={handleClearAll} className="btn btn-outline" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
            Clear All Entries
          </button>
        )}
      </div>

      {/* Analytics Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Feedback Responses</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '0.25rem' }}>{totalCount}</div>
        </div>
        <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Average Experience Rating</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '0.25rem' }}>
            {avgRating} {avgRating !== 'N/A' && '⭐'}
          </div>
        </div>
        <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Recommendation Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80', marginTop: '0.25rem' }}>
            {recommendPercent}%
          </div>
        </div>
      </div>

      {/* Feedback Response List */}
      {totalCount === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', borderRadius: '12px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📥</div>
          <h3>No Feedback Submitted Yet</h3>
          <p style={{ fontSize: '0.88rem' }}>Use the floating feedback button in the bottom right corner to submit a test response.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feedbackList.map((item) => (
            <div key={item.id} className="glass animate-fade-in" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24' }}>
                    {'⭐'.repeat(item.rating || 5)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                    ID: {item.id}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Easy to use: </span>
                  <strong style={{ color: item.easyToUse ? '#4ade80' : '#f87171' }}>
                    {item.easyToUse ? 'Yes 👍' : 'No 👎'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Would recommend: </span>
                  <strong style={{ color: item.wouldRecommend ? '#4ade80' : '#f87171' }}>
                    {item.wouldRecommend ? 'Yes 👍' : 'No 👎'}
                  </strong>
                </div>
              </div>

              {item.feedbackText && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  "{item.feedbackText}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
