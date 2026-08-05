# CrossFund System Architecture

CrossFund is a borderless Web3 crowdfunding platform built on the Stellar network and powered by Soroban smart contracts, featuring native fiat on/off-ramps via Stellar Anchors (SEP-24/SEP-12).

---

## High-Level Architecture

```
                                  +------------------------------------+
                                  |         CrossFund Web App          |
                                  |         (React + Vite UI)          |
                                  +-----------------+------------------+
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         v                                                     v
        +----------------------------------+                 +-----------------------------------+
        |       Freighter Wallet / SDK     |                 |    Stellar Anchor Service (SEP)   |
        |  (Non-custodial Web3 Signatures) |                 | (SEP-24 Interactive Fiat Ramps)   |
        +----------------+-----------------+                 +-----------------+-----------------+
                         |                                                     |
                         v                                                     v
        +----------------------------------+                 +-----------------------------------+
        |     Soroban Smart Contracts      |                 |      Stellar Payment Network      |
        |  - CampaignManager               |                 |  - SEP-12 (KYC Authentication)    |
        |  - DonationManager               |                 |  - Fiat <-> USDC/XLM Settlements  |
        +----------------------------------+                 +-----------------------------------+
```

---

## Component Breakdown

### 1. Soroban Smart Contracts (`/contracts`)

- **`CampaignManager`**:
  - Manages the lifecycle of crowdfunding campaigns (creation, title, target goal, deadline, status).
  - Tracks total funds raised and campaign state transitions (Active, Completed, Cancelled).
  - Enforces authorization so only campaign owners can withdraw accrued funds upon success.

- **`DonationManager`**:
  - Handles donor contributions and securely escrows incoming Stellar tokens/XLM for active campaigns.
  - Maintains verifiable on-chain records of donor contributions.
  - Implements goal-verification and refund mechanisms if a campaign fails to hit its target by the deadline.

---

### 2. Frontend Web Application (`/frontend`)

- Built with **React 19** and **Vite** for high performance and fast dev iteration.
- Uses **`@stellar/stellar-sdk`** and **`@creit.tech/stellar-wallets-kit`** (Freighter Wallet integration) for connecting accounts, signing transactions, and querying Soroban contract states.
- Clean visual components for browsing campaigns, creating campaigns, depositing via fiat, and making direct crypto donations.

---

### 3. Fiat On/Off-Ramp via Stellar Anchors (`/docs/sep-integration.md`)

- **SEP-24 (Hosted Deposit and Withdrawal)**: Enables non-crypto users to deposit local fiat currency (e.g., USD, EUR, NGN, INR) directly into stablecoins (USDC) or XLM via accredited Stellar Anchors.
- **SEP-12 (Customer Information)**: Manages KYC data collection cleanly between the user and anchor providers without storing sensitive identity information on-chain.
