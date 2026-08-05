import { render, screen } from '@testing-library/react';
import CreateCampaign from '../pages/CreateCampaign';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../hooks/useCampaign', () => ({
  useCampaign: () => ({
    createCampaign: vi.fn(),
    loading: false
  })
}));

vi.mock('../hooks/useTransaction', () => ({
  useTransaction: () => ({
    execute: vi.fn(),
    isPending: false
  })
}));

vi.mock('../services/campaign', () => ({
  buildCreateCampaignTx: vi.fn(),
}));

describe('CreateCampaign', () => {
  it('renders campaign creation form', () => {
    render(
      <BrowserRouter>
        <CreateCampaign />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText(/Campaign Title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Goal \(XLM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Campaign/i)).toBeInTheDocument();
  });
});
