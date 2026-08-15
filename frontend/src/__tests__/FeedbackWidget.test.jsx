/**
 * @file src/__tests__/FeedbackWidget.test.jsx
 * @description Unit tests for FeedbackWidget component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackWidget from '../components/FeedbackWidget';

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

describe('FeedbackWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders floating Feedback trigger button', () => {
    render(<FeedbackWidget />);
    const button = screen.getByRole('button', { name: /open user feedback form/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('opens modal dialog when trigger button is clicked', () => {
    render(<FeedbackWidget />);
    const trigger = screen.getByRole('button', { name: /open user feedback form/i });
    fireEvent.click(trigger);

    expect(screen.getByText('💬 Share Your Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText(/feedback category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your comments/i)).toBeInTheDocument();
  });

  it('submits feedback and persists entry to localStorage', async () => {
    render(<FeedbackWidget />);
    const trigger = screen.getByRole('button', { name: /open user feedback form/i });
    fireEvent.click(trigger);

    const textarea = screen.getByLabelText(/your comments/i);
    fireEvent.change(textarea, { target: { value: 'Great experience funding global campaigns!' } });

    const submitBtn = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Feedback Received!')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('crossfund_user_feedback') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].comments).toBe('Great experience funding global campaigns!');
    expect(stored[0].category).toBe('General Feedback');
  });
});
