# WageStream Africa 💸

> On-demand earned wage access for African gig workers, powered by Stellar blockchain.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Network](https://img.shields.io/badge/network-Stellar-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🌍 The Problem

Gig workers across Africa — Bolt drivers, market traders, dispatch riders — earn daily
but get paid weekly or monthly. When emergencies hit mid-week, they resort to loan sharks
charging 30–50% interest. They have already earned the money — they just cannot access it.

Problems:
- ❌ Workers wait weeks to access money they already earned
- ❌ Emergency expenses force workers into high-interest loans
- ❌ No verifiable earnings record for credit access
- ❌ Employers have no transparent payout system

## ✅ The Solution

WageStream Africa lets workers access their already-earned wages any day of the week
via the Stellar blockchain — no loan sharks, no waiting, no banks needed.

- ✅ Workers request advances on earned wages instantly
- ✅ Every transaction is recorded permanently on Stellar
- ✅ Builds a verifiable on-chain earnings record
- ✅ Employers deposit a salary float in USDC on Stellar

## 🛠️ Tech Stack

- **Blockchain:** Stellar Network (Testnet + Mainnet)
- **Smart Transactions:** Stellar SDK (JavaScript)
- **Backend:** Node.js
- **Frontend:** React (coming soon)
- **Environment:** dotenv

## 🚀 Getting Started

1. Clone the repo:

```bash
git clone https://github.com/Dataguru-Labs/wagestreamafrica.git
cd wagestreamafrica
npm install
cp .env.example .env
```

2. Configure the Stellar testnet accounts in `.env`:

```bash
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
PUBLIC_KEY=your_employer_public_key_here
SECRET_KEY=your_employer_secret_key_here
WORKER_PUBLIC_KEY=worker_stellar_public_key_here
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

3. Make sure the employer account holds testnet USDC and the worker account has
   a trustline for the same USDC issuer.

4. Run the demo:

```bash
npm start
```

`requestWageAdvance` now sends a Stellar USDC payment from the employer float to
the worker account, validates the employer USDC balance before submitting, and
stores the disbursement record in the same transaction with a `manageData`
operation.
