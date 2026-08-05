# CrossFund 🌐

> **Borderless Web3 Crowdfunding with Fiat On/Off-Ramps Powered by Stellar & Soroban (SEP-24 / SEP-12)**

---

## 🚀 Overview

**CrossFund** is a next-generation decentralized crowdfunding platform built on the **Stellar blockchain** using **Soroban smart contracts**. CrossFund solves the critical adoption bottleneck of Web3 crowdfunding: forcing non-crypto donors and campaign creators to navigate complex crypto exchanges before contributing or withdrawing funds.

By integrating **Stellar Anchors (SEP-24 & SEP-12)** alongside native **Freighter wallet support**, CrossFund enables users worldwide to support global campaigns using local fiat payment methods (bank transfers, cards, mobile money) or crypto assets (USDC, XLM) with sub-cent transaction fees and instant settlement.

---

## 🛠️ Architecture & Folder Structure

The project follows a clean, modular repository layout designed for separation of concerns and ease of maintenance:

```
crssfund/
├── contracts/                  # Soroban Smart Contracts (Cargo Workspace)
│   ├── Cargo.toml              # Workspace configuration
│   ├── campaign-manager/       # Campaign lifecycle & goal management contract
│   └── donation-manager/       # Escrow, donor tracking & refund logic contract
├── frontend/                   # React + Vite Web Application
│   ├── src/                    # UI components, pages & Freighter wallet hooks
│   ├── public/                 # Static assets & branding
│   ├── index.html              # HTML entry point
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Node.js dependencies & scripts
├── docs/                       # Project Documentation & Standards Specifications
│   ├── architecture.md         # Detailed system architecture and contract interactions
│   └── sep-integration.md      # Stellar Anchors (SEP-24 & SEP-12) integration plan
├── .gitignore                  # Git ignore rules for Rust, Node, and environments
└── README.md                   # Project overview & developer guide
```

---

## ✨ Core Features

- **🌐 Fiat On/Off-Ramps (SEP-24 & SEP-12)**:
  - **SEP-24 Interactive Ramps**: Direct fiat-to-crypto deposit webviews embedded directly in the campaign funding flow.
  - **SEP-12 KYC Integration**: Seamless compliance verification with registered Stellar Anchors.
- **⚡ Soroban Smart Contract Suite**:
  - `CampaignManager`: Manages campaign creation, metadata, target goals, deadlines, and milestone withdrawals.
  - `DonationManager`: Facilitates transparent escrow, verified donor logging, and automated refund triggers if goals are unmet.
- **👛 Freighter Wallet Integration**: Instant 1-click Web3 wallet connection and transaction signing.
- **💸 Near-Zero Fees & Instant Finality**: Powered by Stellar network speed (~3-5 sec confirmation times, fractions of a cent per txn).

---

## 📜 Reused Soroban Smart Contracts

CrossFund reuses and extends the battle-tested Soroban contracts originally developed in `crowdfunding1`:

1. **`campaign-manager`**:
   - Handles campaign registration, owner authorization, goal validation, and campaign status tracking.
2. **`donation-manager`**:
   - Coordinates with `campaign-manager` to safely escrow incoming XLM/USDC donations and maintain an immutable ledger of campaign contributors.

---

## 🚀 Getting Started

### Prerequisites

- **Rust & Cargo** (v1.75+)
- **Soroban CLI** (`cargo install --locked soroban-cli`)
- **Node.js** (v18+) and **npm**
- **Freighter Wallet** browser extension

---

### Smart Contracts Setup (`/contracts`)

1. Navigate to the contracts workspace:
   ```bash
   cd contracts
   ```

2. Build all Soroban smart contracts:
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

3. Run contract tests:
   ```bash
   cargo test
   ```

---

### Frontend Setup (`/frontend`)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

---

## 🗺️ Roadmap & Next Steps

- [x] **Phase 1: Project Scaffolding & Architecture Design**
  - Scaffold modular repository (`/contracts`, `/frontend`, `/docs`).
  - Port proven `CampaignManager` and `DonationManager` Soroban contracts into Cargo workspace.
  - Initialize clean Git version control.
- [ ] **Phase 2: Contract Deployment & Frontend Wiring**
  - Deploy Soroban contracts to Stellar Futurenet/Testnet.
  - Connect React + Vite frontend to testnet contract IDs via Freighter.
- [ ] **Phase 3: SEP-24 & SEP-12 Stellar Anchor Integration**
  - Implement anchor discovery and interactive deposit flow for fiat checkout.
  - Support fiat off-ramp withdrawals for campaign creators.

---

## 📄 License

MIT License. Built for the Stellar Soroban Ecosystem.
