import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import {
  createCampaign as createCampaignService,
  donate as donateService,
  withdraw as withdrawService,
  fetchCampaign as fetchCampaignService,
  fetchAllCampaigns as fetchAllCampaignsService,
} from '../services/stellar';

/**
 * Custom React hook for executing crowdfunding campaign operations and fetching data.
 */
export const useCampaign = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const createCampaign = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      if (addToast) addToast('Preparing & simulating transaction...', 'info');
      const result = await createCampaignService(params);
      if (addToast) addToast('Campaign created successfully!', 'success');
      return result;
    } catch (err) {
      console.error('Failed to create campaign:', err);
      setError(err.message);
      if (addToast) addToast(err.message || 'Failed to create campaign.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const donate = useCallback(async (campaignId, amount) => {
    setLoading(true);
    setError(null);
    try {
      if (addToast) addToast('Simulating & signing donation...', 'info');
      const result = await donateService(campaignId, amount);
      if (addToast) addToast('Donation successful! Thank you!', 'success');
      return result;
    } catch (err) {
      console.error('Failed to donate:', err);
      setError(err.message);
      if (addToast) addToast(err.message || 'Failed to complete donation.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const withdraw = useCallback(async (campaignId) => {
    setLoading(true);
    setError(null);
    try {
      if (addToast) addToast('Processing withdrawal...', 'info');
      const result = await withdrawService(campaignId);
      if (addToast) addToast('Funds withdrawn successfully!', 'success');
      return result;
    } catch (err) {
      console.error('Failed to withdraw:', err);
      setError(err.message);
      if (addToast) addToast(err.message || 'Failed to withdraw funds.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const getCampaign = useCallback(async (campaignId) => {
    setLoading(true);
    try {
      return await fetchCampaignService(campaignId);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      return await fetchAllCampaignsService();
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createCampaign,
    donate,
    withdraw,
    getCampaign,
    getAllCampaigns,
  };
};

export default useCampaign;
