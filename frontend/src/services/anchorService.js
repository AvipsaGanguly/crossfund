/**
 * @file src/services/anchorService.js
 * @description Stellar Anchors Service for CrossFund (SEP-1, SEP-10, SEP-24, SEP-12).
 *
 * Handles:
 * - SEP-1: Stellar.toml Discovery (fetching endpoints & available currencies like SRT)
 * - SEP-10: WebAuth authentication (fetching challenge XDR, signing with Freighter, obtaining JWT)
 * - SEP-24: Interactive deposit flow, interactive withdrawal flow & status polling
 */

import { signTransaction } from './wallet.js';

// Default Stellar Testnet Anchor domain
export const DEFAULT_TESTNET_ANCHOR = 'testanchor.stellar.org';
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

/**
 * Basic TOML parser for stellar.toml files
 * Parses key-value pairs and [[CURRENCIES]] array entries.
 */
function parseStellarToml(tomlText) {
  const result = { CURRENCIES: [] };
  const lines = tomlText.split('\n');
  let currentSection = null;
  let currentCurrency = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[[')) {
      const sectionMatch = line.match(/^\[\[(\w+)\]\]/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        if (currentSection === 'CURRENCIES') {
          currentCurrency = {};
          result.CURRENCIES.push(currentCurrency);
        }
      }
      continue;
    } else if (line.startsWith('[')) {
      const sectionMatch = line.match(/^\[(\w+)\]/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
      }
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      if (currentSection === 'CURRENCIES' && currentCurrency) {
        currentCurrency[key] = val;
      } else if (!currentSection) {
        result[key] = val;
      }
    }
  }

  return result;
}

/**
 * Step 1: SEP-1 Discovery
 * Fetches and parses stellar.toml for an anchor domain.
 *
 * @param {string} [domain=DEFAULT_TESTNET_ANCHOR] - Target anchor domain
 * @returns {Promise<{
 *   webAuthEndpoint: string,
 *   transferServerSep24: string,
 *   kycServer: string,
 *   currencies: Array<{code: string, issuer: string}>
 * }>}
 */
export async function getAnchorTomlInfo(domain = DEFAULT_TESTNET_ANCHOR) {
  const url = `https://${domain}/.well-known/stellar.toml`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml from ${domain} (Status ${response.status})`);
    }

    const text = await response.text();
    const toml = parseStellarToml(text);

    return {
      webAuthEndpoint: toml.WEB_AUTH_ENDPOINT || `https://${domain}/auth`,
      transferServerSep24: toml.TRANSFER_SERVER_SEP0024 || `https://${domain}/sep24`,
      kycServer: toml.KYC_SERVER || `https://${domain}/sep12`,
      currencies: toml.CURRENCIES || [{ code: 'SRT' }],
    };
  } catch (error) {
    console.warn(`[SEP-1] Fallback used for ${domain}:`, error.message);
    return {
      webAuthEndpoint: `https://${domain}/auth`,
      transferServerSep24: `https://${domain}/sep24`,
      kycServer: `https://${domain}/sep12`,
      currencies: [{ code: 'SRT' }],
    };
  }
}

/**
 * Step 1.5a: SEP-12 GET /customer Status Check
 * Retrieves current KYC customer status (NEEDS_INFO, ACCEPTED, PENDING, REJECTED) and required fields.
 *
 * @param {string} kycServerEndpoint - Anchor KYC_SERVER endpoint
 * @param {string} jwtToken - Authenticated JWT Token
 * @param {string} userPublicKey - User's Stellar Public Key
 * @returns {Promise<{ id?: string, status: string, fields?: Object, provided_fields?: Object }>}
 */
export async function getCustomerKycStatus(kycServerEndpoint, jwtToken, userPublicKey) {
  const url = `${kycServerEndpoint}/customer?account=${encodeURIComponent(userPublicKey)}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SEP-12 GET /customer status check failed (${response.status}): ${errText}`);
  }

  return await response.json();
}

/**
 * Step 1.5b: SEP-12 Customer KYC Submission (PUT /customer)
 * Submits customer KYC information (first_name, last_name, email_address, etc.) to anchor's KYC server using FormData.
 *
 * @param {string} kycServerEndpoint - Anchor KYC_SERVER endpoint
 * @param {string} jwtToken - Authenticated JWT Token from SEP-10
 * @param {Object} kycFields - Basic customer KYC details
 * @param {string} kycFields.first_name
 * @param {string} kycFields.last_name
 * @param {string} kycFields.email_address
 * @param {string} [kycFields.account]
 * @returns {Promise<{ id: string, status: 'ACCEPTED' | 'PENDING' | 'NEEDS_INFO' | 'REJECTED' }>}
 */
export async function submitCustomerKyc(kycServerEndpoint, jwtToken, kycFields) {
  const url = `${kycServerEndpoint}/customer`;

  const formData = new FormData();
  Object.keys(kycFields).forEach((key) => {
    if (kycFields[key] !== undefined && kycFields[key] !== null) {
      formData.append(key, kycFields[key]);
    }
  });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok && response.status !== 202) {
    const errText = await response.text();
    throw new Error(`SEP-12 KYC submission failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const customerId = data.id;

  // Query updated customer status via GET /customer
  let currentStatus = 'ACCEPTED';
  if (kycFields.account) {
    try {
      const checkRes = await getCustomerKycStatus(kycServerEndpoint, jwtToken, kycFields.account);
      currentStatus = checkRes.status || 'ACCEPTED';
    } catch (e) {
      console.warn('[SEP-12 Status Check Warning]:', e.message);
    }
  }

  return {
    id: customerId,
    status: currentStatus,
  };
}

/**
 * Step 2: SEP-10 WebAuth Complete Authentication Flow
 * Obtains challenge XDR from anchor, signs it using connected wallet, and exchanges it for a JWT token.
 *
 * @param {string} webAuthEndpoint - Anchor WEB_AUTH_ENDPOINT
 * @param {string} userPublicKey - User's Stellar public key G...
 * @returns {Promise<string>} JWT Bearer Token
 */
export async function authenticateWithAnchor(webAuthEndpoint, userPublicKey) {
  if (!userPublicKey) {
    throw new Error('User wallet public key is required for SEP-10 authentication.');
  }

  // 1. Fetch challenge XDR
  const challengeUrl = `${webAuthEndpoint}?account=${encodeURIComponent(userPublicKey)}`;
  const challengeRes = await fetch(challengeUrl);
  if (!challengeRes.ok) {
    const errText = await challengeRes.text();
    throw new Error(`SEP-10 Challenge failed (${challengeRes.status}): ${errText}`);
  }

  const challengeData = await challengeRes.json();
  const challengeXdr = challengeData.transaction;
  const networkPassphrase = challengeData.network_passphrase || TESTNET_PASSPHRASE;

  if (!challengeXdr) {
    throw new Error('No transaction XDR returned in SEP-10 challenge response.');
  }

  // 2. Sign challenge XDR with active wallet (Freighter / kit)
  const signingResult = await signTransaction(challengeXdr, {
    networkPassphrase,
  });

  const signedXdr = typeof signingResult === 'string' ? signingResult : (signingResult.signedTxXdr || signingResult.xdr);

  // 3. Post signed XDR back to anchor to obtain JWT
  const tokenRes = await fetch(webAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXdr }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`SEP-10 JWT verification failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.token) {
    throw new Error('No JWT bearer token returned by anchor authentication.');
  }

  return tokenData.token;
}

/**
 * Step 3: SEP-24 Interactive Deposit Request
 * Requests interactive deposit URL from anchor for asset (default: SRT).
 *
 * @param {string} transferServerEndpoint - Anchor TRANSFER_SERVER_SEP0024
 * @param {string} jwtToken - Authenticated JWT Token from SEP-10
 * @param {Object} options
 * @param {string} [options.assetCode='SRT'] - Stellar asset code to deposit
 * @param {string} options.userPublicKey - User's Stellar public key
 * @returns {Promise<{ id: string, url: string, type: string }>} Interactive URL details
 */
export async function initiateInteractiveDeposit(transferServerEndpoint, jwtToken, { assetCode = 'SRT', userPublicKey }) {
  const depositUrl = `${transferServerEndpoint}/transactions/deposit/interactive`;

  const formData = new FormData();
  formData.append('asset_code', assetCode);
  formData.append('account', userPublicKey);

  const response = await fetch(depositUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SEP-24 Interactive Deposit request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: data.url,
    type: data.type || 'interactive_customer_info_needed',
  };
}

/**
 * Helper: Opens SEP-24 interactive checkout in a centered popup window for user completion.
 *
 * @param {string} url - Anchor interactive checkout URL
 * @param {string} [title='Stellar Anchor Interactive Checkout'] - Window title
 * @returns {Window | null} Window reference
 */
export function openInteractiveWindow(url, title = 'Stellar Anchor Interactive Checkout') {
  if (typeof window !== 'undefined' && window.open) {
    const width = 600;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const popupWindow = window.open(
      url,
      title,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
    if (popupWindow) popupWindow.focus();
    return popupWindow;
  }
  return null;
}

/**
 * Step 3b: SEP-24 Interactive Withdrawal Request
 * Requests interactive withdrawal URL from anchor for asset (default: SRT).
 *
 * @param {string} transferServerEndpoint - Anchor TRANSFER_SERVER_SEP0024
 * @param {string} jwtToken - Authenticated JWT Token from SEP-10
 * @param {Object} options
 * @param {string} [options.assetCode='SRT'] - Stellar asset code to withdraw
 * @param {string} options.userPublicKey - Campaign creator's Stellar public key
 * @returns {Promise<{ id: string, url: string, type: string }>} Interactive URL details
 */
export async function initiateInteractiveWithdrawal(transferServerEndpoint, jwtToken, { assetCode = 'SRT', userPublicKey }) {
  const withdrawUrl = `${transferServerEndpoint}/transactions/withdraw/interactive`;

  const formData = new FormData();
  formData.append('asset_code', assetCode);
  formData.append('account', userPublicKey);

  const response = await fetch(withdrawUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SEP-24 Interactive Withdrawal request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: data.url,
    type: data.type || 'interactive_customer_info_needed',
  };
}

/**
 * Step 4: SEP-24 Transaction Status Poller
 * Queries anchor for the current state of a deposit or withdrawal transaction.
 *
 * @param {string} transferServerEndpoint - Anchor TRANSFER_SERVER_SEP0024
 * @param {string} jwtToken - Authenticated JWT Token
 * @param {string} transactionId - SEP-24 Transaction ID
 * @returns {Promise<Object>} Transaction status object
 */
export async function getDepositTransactionStatus(transferServerEndpoint, jwtToken, transactionId) {
  const url = `${transferServerEndpoint}/transaction?id=${encodeURIComponent(transactionId)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SEP-24 Status check failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.transaction;
}
