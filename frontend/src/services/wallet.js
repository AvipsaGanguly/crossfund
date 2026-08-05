/**
 * @file src/services/wallet.js
 * @description Wallet service for Stellar Journey Crowdfunding.
 * Manages Stellar wallet connections using @creit.tech/stellar-wallets-kit v2.5.
 *
 * KEY DESIGN DECISIONS:
 * - App ALWAYS starts in a disconnected state on page load.
 * - NO localStorage or sessionStorage persistence for wallet state.
 * - NO automatic reconnect calls on startup.
 * - Every manual "Connect Wallet" action prompts module selection or open authModal.
 * - Selected wallet module executes getAddress({ skipRequestAccess: false }) to
 *   trigger the wallet extension's authorization popup.
 * - disconnectWallet() resets in-memory session state completely.
 * - switchWallet() clears existing session and triggers fresh wallet selection.
 */

import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { RabetModule } from '@creit.tech/stellar-wallets-kit/modules/rabet';

// ─── Supported wallet identifiers ────────────────────────────────────────────
export const SUPPORTED_WALLETS = {
  FREIGHTER: 'freighter',
  XBULL: 'xbull',
  ALBEDO: 'albedo',
  LOBSTR: 'lobstr',
  RABET: 'rabet',
};

// ─── In-memory session state (NEVER persisted to storage) ────────────────────
let activeWalletId = null;
let activeAddress = null;
let kitInitialized = false;

// ─── Kit singleton initialization ───────────────────────────────────────────
export function initKit() {
  if (!kitInitialized) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: SUPPORTED_WALLETS.FREIGHTER,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
        new LobstrModule(),
        new RabetModule(),
      ],
    });
    kitInitialized = true;
  }
}

function isSupportedWallet(walletId) {
  if (!walletId) return false;
  return Object.values(SUPPORTED_WALLETS).includes(walletId.toLowerCase());
}

/**
 * Connects to a Stellar wallet.
 *
 * If walletId is NOT provided, invokes StellarWalletsKit.authModal() to show
 * the kit's official selection modal.
 * If walletId IS provided, sets the wallet module and calls getAddress({ skipRequestAccess: false })
 * to trigger the wallet extension authorization popup.
 *
 * @param {string|null} [walletId=null] - Target wallet ID or null to open kit modal
 * @returns {Promise<{walletId: string, address: string, isConnected: boolean}>} Connected session payload
 */
export async function connectWallet(walletId = null) {
  initKit();

  // If no explicit walletId was passed, open official StellarWalletsKit.authModal()
  if (!walletId) {
    try {
      const modalRes = await StellarWalletsKit.authModal();
      const selectedId = StellarWalletsKit.selectedModule?.productId || SUPPORTED_WALLETS.FREIGHTER;

      if (!modalRes?.address || typeof modalRes.address !== 'string') {
        throw new Error('No public key address received from wallet authentication.');
      }

      activeWalletId = selectedId.toLowerCase();
      activeAddress = modalRes.address;

      return { walletId: activeWalletId, address: activeAddress, isConnected: true };
    } catch (error) {
      const msg = error?.message || String(error);
      if (msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('dismiss')) {
        throw new Error('Wallet connection modal was closed by user.');
      }
      throw new Error(`Wallet authentication failed: ${msg}`);
    }
  }

  // Explicit wallet selection flow
  const normalizedId = walletId.toLowerCase();

  if (!isSupportedWallet(normalizedId)) {
    throw new Error(
      `Unsupported wallet "${walletId}". Supported: ${Object.values(SUPPORTED_WALLETS).join(', ')}.`
    );
  }

  // Select module in the kit
  StellarWalletsKit.setWallet(normalizedId);

  try {
    // Calling getAddress({ skipRequestAccess: false }) forces requestAccess() to run first,
    // prompting the extension authorization popup.
    const { address } = await StellarWalletsKit.selectedModule.getAddress({ skipRequestAccess: false });

    if (!address || typeof address !== 'string') {
      throw new Error(`No valid public key address returned from ${normalizedId}.`);
    }

    activeWalletId = normalizedId;
    activeAddress = address;

    return { walletId: activeWalletId, address: activeAddress, isConnected: true };

  } catch (error) {
    const msg = error?.message || String(error);
    const lower = msg.toLowerCase();

    if (
      lower.includes('not installed') ||
      lower.includes('not found') ||
      lower.includes('not available') ||
      lower.includes('missing')
    ) {
      throw new Error(
        `The ${normalizedId} wallet extension is not installed or unavailable in your browser.`
      );
    }

    if (
      lower.includes('reject') ||
      lower.includes('user denied') ||
      lower.includes('cancel') ||
      lower.includes('declined')
    ) {
      throw new Error('Connection request was rejected by the user in wallet popup.');
    }

    throw new Error(`Failed to connect ${normalizedId}: ${msg}`);
  }
}

/**
 * Disconnects the wallet — completely resets in-memory application session state.
 */
export function disconnectWallet() {
  activeWalletId = null;
  activeAddress = null;
  return true;
}

/**
 * Switches wallet — disconnects current session and connects to new wallet.
 *
 * @param {string|null} [newWalletId=null] - Target wallet ID or null to open selection modal
 */
export async function switchWallet(newWalletId = null) {
  disconnectWallet();
  return await connectWallet(newWalletId);
}

/** Returns true if an active in-memory session exists. */
export function isWalletConnected() {
  return Boolean(activeWalletId && activeAddress);
}

/** Returns current in-memory session state details. */
export function getActiveWallet() {
  return {
    walletId: activeWalletId,
    address: activeAddress,
    isConnected: isWalletConnected(),
  };
}

/**
 * Signs a transaction XDR with the currently active wallet.
 *
 * @param {string} xdr - Unsigned transaction XDR string
 * @param {Object} [opts={}] - Optional signing parameters
 * @returns {Promise<{signedTxXdr: string, signerAddress: string}>} Signed transaction result
 */
export async function signTransaction(xdr, opts = {}) {
  if (!isWalletConnected()) {
    throw new Error('No wallet connected. Please connect a wallet first.');
  }
  if (!xdr || typeof xdr !== 'string') {
    throw new Error('Invalid XDR string provided for signing.');
  }

  initKit();

  try {
    const result = await StellarWalletsKit.signTransaction(xdr, opts);
    return result;
  } catch (error) {
    const msg = error?.message || String(error);
    const lower = msg.toLowerCase();

    if (
      lower.includes('reject') ||
      lower.includes('user denied') ||
      lower.includes('cancel') ||
      lower.includes('declined')
    ) {
      throw new Error('Transaction signing was rejected by the user in wallet.');
    }

    if (lower.includes('disconnected') || lower.includes('session expired')) {
      disconnectWallet();
      throw new Error('Wallet session expired. Please reconnect.');
    }

    throw new Error(`Signing failed: ${msg}`);
  }
}
