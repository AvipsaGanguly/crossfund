/**
 * @file src/__tests__/FeedbackAdmin.test.jsx
 * @description Unit tests for FeedbackAdmin page component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import FeedbackAdmin from '../pages/FeedbackAdmin';
import { saveFeedback, FEEDBACK_STORAGE_KEY } from '../components/FeedbackWidget';

describe('FeedbackAdmin Page Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders empty feedback message when no feedback is stored', () => {
    render(<FeedbackAdmin />);
    expect(screen.getByText(/User Feedback Admin Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText('No Feedback Submitted Yet')).toBeInTheDocument();
  });

  it('renders list of real submitted feedback responses', () => {
    saveFeedback({
      rating: 5,
      easyToUse: true,
      wouldRecommend: true,
      feedbackText: 'Outstanding Web3 crowdfunding UX with Soroban!',
    });

    render(<FeedbackAdmin />);
    expect(screen.getByText('Total Feedback Responses')).toBeInTheDocument();
    expect(screen.getByText('"Outstanding Web3 crowdfunding UX with Soroban!"')).toBeInTheDocument();
    expect(screen.getAllByText('Yes 👍').length).toBe(2);
  });
});
