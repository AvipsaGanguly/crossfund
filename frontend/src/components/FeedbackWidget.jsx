import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('General Feedback');
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comments.trim()) return;

    const feedbackEntry = {
      id: Date.now(),
      category,
      rating,
      comments: comments.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store in localStorage for persistence
    try {
      const existing = JSON.parse(localStorage.getItem('crossfund_user_feedback') || '[]');
      localStorage.setItem('crossfund_user_feedback', JSON.stringify([...existing, feedbackEntry]));
    } catch (e) {
      console.warn('[Feedback Persistence Warning]:', e);
    }

    setIsSubmitted(true);
    if (toast?.addToast) {
      toast.addToast('Thank you for your feedback!', 'success');
    }

    setTimeout(() => {
      setIsOpen(false);
      setIsSubmitted(false);
      setComments('');
      setCategory('General Feedback');
      setRating(5);
    }, 1500);
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

            {isSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ color: '#4ade80', margin: 0 }}>Feedback Received!</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.4rem' }}>
                  Thank you for helping us improve CrossFund.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Feedback Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="General Feedback" style={{ background: '#1e293b' }}>General Feedback</option>
                    <option value="Bug Report" style={{ background: '#1e293b' }}>Bug Report</option>
                    <option value="Feature Request" style={{ background: '#1e293b' }}>Feature Request</option>
                    <option value="Anchor / Fiat On-Ramp" style={{ background: '#1e293b' }}>Anchor / Fiat On-Ramp</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Experience Rating
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

                <div>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Your Comments
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Tell us what you loved or what we can fix..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.88rem', resize: 'vertical' }}
                  />
                </div>

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
            )}
          </div>
        </div>
      )}
    </>
  );
}
