/**
 * @file src/__tests__/FeedbackWidget.test.jsx
 * @description Unit tests for FeedbackWidget UI component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackWidget from '../components/FeedbackWidget';

describe('FeedbackWidget UI Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders floating Feedback trigger button', () => {
    render(<FeedbackWidget />);
    const button = screen.getByRole('button', { name: /open user feedback form/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('opens modal with star rating, yes/no toggles, and text field', () => {
    render(<FeedbackWidget />);
    const trigger = screen.getByRole('button', { name: /open user feedback form/i });
    fireEvent.click(trigger);

    expect(screen.getByText('💬 Share Your Feedback')).toBeInTheDocument();
    expect(screen.getByText('Overall Rating')).toBeInTheDocument();
    expect(screen.getByText('Was CrossFund easy to use?')).toBeInTheDocument();
    expect(screen.getByText('Would you recommend CrossFund to others?')).toBeInTheDocument();
    expect(screen.getByLabelText(/additional feedback/i)).toBeInTheDocument();
  });

  it('handles submit click as UI no-op', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<FeedbackWidget />);
    const trigger = screen.getByRole('button', { name: /open user feedback form/i });
    fireEvent.click(trigger);

    const submitBtn = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitBtn);

    expect(consoleSpy).toHaveBeenCalledWith('Feedback submitted (UI only):', expect.any(Object));
  });
});
