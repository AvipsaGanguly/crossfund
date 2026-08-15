import React, { useState } from 'react';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [easyToUse, setEasyToUse] = useState(true);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Feedback submitted (UI only):', {
      rating,
      easyToUse,
      wouldRecommend,
      feedbackText,
    });
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open User Feedback Form"
        title="Share your feedback"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 900,
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '0.65rem 1.15rem',
          fontWeight: 600,
          fontSize: '0.88rem',
          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <span>💬</span>
        <span>Feedback</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              background: '#1e293b',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '92%',
              maxWidth: '420px',
              color: '#f8fafc',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                💬 Share Your Feedback
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Star Rating */}
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Overall Rating
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        opacity: star <= rating ? 1 : 0.3,
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Yes/No Toggle: Easy to use */}
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Was CrossFund easy to use?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEasyToUse(true)}
                    className={`btn ${easyToUse ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    Yes 👍
                  </button>
                  <button
                    type="button"
                    onClick={() => setEasyToUse(false)}
                    className={`btn ${!easyToUse ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    No 👎
                  </button>
                </div>
              </div>

              {/* Yes/No Toggle: Would recommend */}
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Would you recommend CrossFund to others?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`btn ${wouldRecommend ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    Yes 👍
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`btn ${!wouldRecommend ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    No 👎
                  </button>
                </div>
              </div>

              {/* Text Field */}
              <div>
                <label htmlFor="feedback-text" style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Additional Feedback
                </label>
                <textarea
                  id="feedback-text"
                  rows="3"
                  placeholder="Share any thoughts or suggestions..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
