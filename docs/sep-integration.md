# Stellar Anchors Integration Plan (SEP-24 & SEP-12)

CrossFund bridges traditional fiat payment networks with Stellar Soroban smart contracts. This document outlines how **SEP-24** and **SEP-12** are used to provide friction-free fiat on/off-ramping.

---

## 1. Overview of Standards

- **SEP-24 (Hosted Deposit & Withdrawal)**: Defines an interactive flow where an anchor opens a secure web view allowing users to complete fiat payment (bank transfer, debit/credit card, mobile money) and receive Stellar-native assets (e.g. USDC, XLM) into their wallet.
- **SEP-12 (KYC API)**: Allows wallets and applications to securely transmit customer identity data to an anchor to satisfy regulatory requirements before processing fiat transactions.

---

## 2. Integration Lifecycle

```
[ Donor ] ---> 1. Selects "Donate with Fiat" on CrossFund UI
              ---> 2. Selects Local Currency & Anchor Provider
              ---> 3. SEP-12 KYC Verification (Interactive Webview)
              ---> 4. SEP-24 Hosted Deposit Flow (Bank Transfer / Card)
              ---> 5. Anchor issues USDC/XLM to Donor's Stellar Address
              ---> 6. Automated or 1-Click Soroban Donation Transaction
              ---> 7. Escrowed in DonationManager Smart Contract
```

---

## 3. Implementation Phases

1. **Phase 1: Direct Soroban Crypto Donations (Current Base)**
   - Connect Freighter wallet to sign transactions directly to `DonationManager`.

2. **Phase 2: SEP-24 Deposit Flow Scaffolding**
   - Query anchor `toml` file (`stellar.toml`) to extract `TRANSFER_SERVER_SEP0024` endpoint.
   - Trigger interactive web view for fiat-to-USDC conversion.

3. **Phase 3: SEP-12 Customer Verification & Off-Ramping for Creators**
   - Enable campaign creators to withdraw raised funds directly to local bank accounts via SEP-24 withdrawals.
