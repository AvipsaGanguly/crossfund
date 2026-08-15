/**
 * @file src/__tests__/FeedbackWidget.test.jsx
 * @description Unit tests for FeedbackWidget submission and storage logic.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackWidget, { saveFeedback, getStoredFeedback, FEEDBACK_STORAGE_KEY } from '../components/FeedbackWidget';

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

describe('FeedbackWidget Persistence Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and retrieves feedback entry via saveFeedback and getStoredFeedback', () => {
    const entry = saveFeedback({
      rating: 5,
      easyToUse: true,
      wouldRecommend: true,
      feedbackText: 'Seamless SEP-24 testnet deposit flow!',
    });

    expect(entry.id).toMatch(/^fb_/);
    expect(entry.rating).toBe(5);

    const stored = getStoredFeedback();
    expect(stored.length).toBe(1);
    expect(stored[0].feedbackText).toBe('Seamless SEP-24 testnet deposit flow!');
  });

  it('submits feedback via UI modal and persists record', () => {
    render(<FeedbackWidget />);
    const trigger = screen.getByRole('button', { name: /open user feedback form/i });
    fireEvent.click(trigger);

    const textarea = screen.getByLabelText(/additional feedback/i);
    fireEvent.change(textarea, { target: { value: 'Great experience funding community projects!' } });

    const submitBtn = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Feedback Saved!')).toBeInTheDocument();

    const stored = getStoredFeedback();
    expect(stored.length).toBe(1);
    expect(stored[0].feedbackText).toBe('Great experience funding community projects!');
  });
});
