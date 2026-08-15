# CrossFund 🌐

> **Borderless Web3 Crowdfunding with Fiat On/Off-Ramps Powered by Stellar & Soroban (SEP-24 / SEP-12)**

---

## 🚀 Overview

**CrossFund** is a next-generation decentralized crowdfunding platform built on the **Stellar blockchain** using **Soroban smart contracts**. CrossFund solves the critical adoption bottleneck of Web3 crowdfunding: forcing non-crypto donors and campaign creators to navigate complex crypto exchanges before contributing or withdrawing funds.

By integrating **Stellar Anchors (SEP-24 & SEP-12)** alongside native **Freighter wallet support**, CrossFund enables users worldwide to support global campaigns using local fiat payment methods (bank transfers, cards, mobile money) or crypto assets (USDC, XLM) with sub-cent transaction fees and instant settlement.

---

## 🔗 Live Demo & Deployed Contracts (Stellar Testnet)

- **Live Web Application Demo**: `[I will provide this after Vercel deploy]`
- **Soroban Testnet RPC**: `https://soroban-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`

### Deployed Contract Addresses

| Contract Name | Soroban Contract ID |
|---|---|
| **`campaign-manager`** | `CC7JRYZUDKIHRMOZCFFQBXB4ZJKHRGMYAWYTDYTNAH4MRLDAFAVOSLJ7` |
| **`donation-manager`** | `CAIIQLXDPVHB367ZI4IM7MKCFTEOB3IWUGQMC7R2ZFASMRXSHC2VFBT6` |

---

## 🛠️ Architecture & Data Flow

```
                                  +---------------------------------------+
                                  |            CrossFund UI               |
                                  |         (React + Vite SPA)            |
                                  +-------------------+-------------------+
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                                   |                                   |
                  v                                   v                                   v
    +---------------------------+       +---------------------------+       +---------------------------+
    |      Freighter Wallet     |       |    Soroban Testnet Contracts |       |     Stellar Anchor        |
    |      (Wallet Kit v2)      |       |  (Campaign & Donation Mgr) |       |  (testanchor.stellar.org) |
    +-------------+-------------+       +-------------+-------------+       +-------------+-------------+
                  |                                   |                                   |
                  | Sign XDR                          | On-Chain Execution                | SEP-1 / 10 / 12 / 24
                  v                                   v                                   v
    +---------------------------+       +---------------------------+       +---------------------------+
    | Transaction Authorization |       |  create_campaign()        |       | SEP-1: stellar.toml info |
    | & WebAuth Challenge Sign  |       |  donate()                 |       | SEP-10: WebAuth JWT       |
    +---------------------------+       |  get_all_campaigns()      |       | SEP-12: PUT /customer KYC |
                                        +---------------------------+       | SEP-24: Interactive URL   |
                                                                            +---------------------------+
```

### Component Breakdown:
1. **Soroban Smart Contracts (`/contracts`)**:
   - **`campaign-manager`**: Handles campaign lifecycle registration, target goal metrics, deadlines, owner permissions, and query methods (`get_all_campaigns`).
   - **`donation-manager`**: Manages native XLM escrow donations, donor tracking logs, and automated refund checks.
2. **Frontend Architecture (`/frontend`)**:
   - Built with **React 19**, **Vite**, **Stellar SDK v16**, **Stellar Wallets Kit**, **Vercel Analytics**, and **Sentry Error Tracking**.
   - Modular hook system (`useWallet`, `useTransaction`, `useEvents`, `useToast`) powering interactive state management.
3. **Stellar Anchor Integration Flow (`anchorService.js`)**:
   - **SEP-1 Discovery**: Queries `https://testanchor.stellar.org/.well-known/stellar.toml` to extract `TRANSFER_SERVER_SEP0024`, `WEB_AUTH_ENDPOINT`, and `KYC_SERVER`.
   - **SEP-10 WebAuth**: Requests challenge XDR, signs via Freighter wallet, and exchanges signature for an authenticated JWT Bearer token.
   - **SEP-12 Customer KYC**: Submits user identity fields (`first_name`, `last_name`, `email_address`) via `PUT /customer` (`FormData`), checking returned customer status (`NEEDS_INFO` / `ACCEPTED`).
   - **SEP-24 Interactive Deposit**: Requests interactive deposit session URL (`POST /sep24/transactions/deposit/interactive`), launches interactive checkout in an embedded iframe/popup, and polls transaction status.

---

## 📷 Application Screenshots

*(Replace placeholders with actual screenshot images)*

### 1. Home Landing & Campaign Showcase
![Home Landing Page Placeholder](./docs/screenshots/home-preview.png)

### 2. Campaign Creation & On-Chain Confirmation
![Campaign Creation Form Placeholder](./docs/screenshots/create-campaign.png)

### 3. SEP-24 Interactive Fiat Deposit & Anchor Webview
![SEP-24 Interactive Checkout Placeholder](./docs/screenshots/sep24-checkout.png)

### 4. Creator Dashboard & Analytics
![Creator Dashboard Placeholder](./docs/screenshots/dashboard.png)

---

## 🏦 SEP-24 & SEP-12 Anchor Integration Summary

| Specification | Feature Description | Implementation Status | Live Anchor Verification |
|---|---|---|---|
| **SEP-1** | Stellar.toml Endpoint Discovery | **Fully Implemented** | Tested against `testanchor.stellar.org` |
| **SEP-10** | WebAuth Challenge & JWT Exchange | **Fully Implemented** | Challenge XDR signed via Freighter |
| **SEP-12** | KYC Customer Info (`PUT /customer`) | **Fully Implemented** | Verified status transition (`NEEDS_INFO` → `ACCEPTED`) |
| **SEP-24** | Interactive Deposit Initiation | **Fully Implemented** | Tested (`fc99387f-4525-4af5-845e-80f7ac68e4bf`) |
| **SEP-24** | Webview Checkout & Iframe Container | **Fully Implemented** | Interactive checkout window rendered |
| **SEP-24** | Transaction Status Polling | **Fully Implemented** | Polling loop tracking `incomplete` → `completed` |
| **SEP-38 / Path Payments** | Fiat Asset Conversion to XLM | **Simulated Path Estimate** | Liquidity estimate calculated via Stellar DEX |

> [!NOTE]
> `testanchor.stellar.org` operates on Stellar Testnet for sandbox demonstration purposes. In production environments, live registered Stellar Anchors execute real fiat bank/card transfers.

---

## 💻 Local Setup & Development Guide

### Prerequisites

- **Node.js** (v18+ or v20+) and **npm**
- **Rust & Cargo** (v1.75+) with `wasm32-unknown-unknown` target
- **Soroban CLI** (`cargo install --locked soroban-cli`)
- **Freighter Wallet Extension**

---

### 1. Frontend Setup (`/frontend`)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies (using legacy peer deps for React 19 compatibility)
npm install --legacy-peer-deps

# 3. Create .env file with testnet contract IDs
cp .env.example .env

# 4. Start local development server
npm run dev

# 5. Run test suite
npm test

# 6. Execute production build
npm run build
```

---

### 2. Smart Contracts Setup (`/contracts`)

```bash
# 1. Navigate to contracts workspace
cd contracts

# 2. Build WASM binaries
cargo build --target wasm32-unknown-unknown --release

# 3. Run Rust unit tests
cargo test
```

---

## 📄 License

MIT License. Built for the Stellar & Soroban Ecosystem.
