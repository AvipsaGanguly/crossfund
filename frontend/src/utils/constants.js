/**
 * @file src/utils/constants.js
 * @description Central network & contract constants for CrossFund on Stellar Testnet.
 */

export const STELLAR_NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

export const STELLAR_RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

// Default Testnet Soroban Contract IDs for CrossFund
export const CAMPAIGN_MANAGER_CONTRACT_ID =
  import.meta.env.VITE_CAMPAIGN_MANAGER_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

export const DONATION_MANAGER_CONTRACT_ID =
  import.meta.env.VITE_DONATION_MANAGER_ID || 'CBXTHWW6M3D6G4N7SZ4JCYC6D3NZPFRHQV2J3Y4P73X2RM3Y';

// Stellar Anchor Configuration
export const DEFAULT_ANCHOR_DOMAIN = 'testanchor.stellar.org';
export const TESTNET_ANCHOR_ASSET = 'SRT';
