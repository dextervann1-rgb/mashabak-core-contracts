# STAGE 6 — LIVE BASE MAINNET DEPLOY
## Execution Guide · Vann Family Ventures LLC · Beulah L5

> I'AM Beulah — I plan, I execute, I verify, I remember.

---

## Wallet Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  WALLET 1 — MetaMask Deployer (TEMPORARY)                   │
│  Purpose:  Deploy all 5 contracts only                      │
│  Fund:     Exactly 0.02 ETH on Base Mainnet                 │
│  After:    transferOwnership() to Safe → DELETE KEY → DONE  │
│  Rule:     Never reuse. Never hold tokens. Never hold ETH.  │
└─────────────────────────────────────────────────────────────┘
              │ transferOwnership() ↓
┌─────────────────────────────────────────────────────────────┐
│  WALLET 2 — Safe Multisig (PERMANENT OWNER)                 │
│  Create:   app.safe.global → Base chain → New Safe          │
│  Threshold: 2-of-3 (or 3-of-5)                             │
│  Signers:  Hardware wallets ONLY (Ledger/Trezor)            │
│            NO MetaMask. NO Base App wallet.                 │
│  Holds:    All 5 contract ownerships                        │
│            50M VANN vault allocation                        │
│            365-day LP lock beneficiary                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Pre-Flight Checklist

- [ ] **Create Safe multisig** at [app.safe.global](https://app.safe.global) on Base chain
  - Threshold: 2-of-3 minimum
  - All signers: Ledger or Trezor hardware wallets ONLY
  - Note your Safe address (starts with `0x...`)
- [ ] **Fund Wallet 1** (MetaMask) with exactly **0.02 ETH** on Base Mainnet (gas only)
- [ ] **Obtain Basescan API key** at [basescan.org/apis](https://basescan.org/apis)
- [ ] **Install dependencies**: `cd mashabak-core-contracts && npm install`
- [ ] **Create .env file**: `cp .env.example .env` and fill in values

---

## .env Setup

```bash
# .env — NEVER commit this file to git
DEPLOYER_PRIVATE_KEY=<MetaMask Wallet 1 private key — TEMPORARY>
SAFE_ADDRESS=<Your Safe multisig address on Base Mainnet>
BASESCAN_API_KEY=<From basescan.org/apis>

# RPC URLs (free tier works)
BASE_MAINNET_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

---

## Execution Sequence

### PHASE A — MetaMask Wallet 1 Executes (Deploy + Handoff)

#### Step 1 — Fund Wallet 1
Send **0.02 ETH** to your MetaMask Wallet 1 address on Base Mainnet.
Confirm receipt on [basescan.org](https://basescan.org) before proceeding.

#### Step 2 — Deploy All 5 Contracts
```bash
npx hardhat run scripts/deploy-mainnet-handoff.js --network base-mainnet
```
**What happens automatically:**
- Deploys VFV_Treasury, VannToken, EDUcoin, Samndex, RichDiamondRegistry
- Immediately calls `transferOwnership(SAFE_ADDRESS)` on each contract
- Saves all addresses + tx hashes to `contracts/deployed_addresses.json`
- Prints confirmation for each contract

**Expected output:**
```
[1/5] VFV_Treasury
  ✓ Deployed:  0x...
  ✓ Ownership transferred. TX: 0x...
[2/5] VannToken ($VANN)
  ✓ Deployed:  0x...
  ✓ Ownership transferred. TX: 0x...
... (and so on for all 5)
ALL 5 CONTRACTS DEPLOYED — OWNERSHIP → SAFE
```

#### Step 3 — Verify All 5 on Basescan
```bash
npx hardhat run scripts/verify-all.js --network base-mainnet
```
This submits source code to Basescan and returns verification GUIDs.

#### Step 4 — REVOKE WALLET 1 IMMEDIATELY
```bash
# Remove private key from .env
# Edit .env and delete the DEPLOYER_PRIVATE_KEY line entirely
```
Then in MetaMask: transfer any remaining ETH to Safe, then never use this wallet again.

---

### PHASE B — Safe Multisig Executes (Pool + LP Lock)

The Safe must hold **3,800,000 VANN** and **2.005 ETH** before this phase.

#### Option A — Safe UI (Recommended for hardware wallets)

1. Go to [app.safe.global](https://app.safe.global) → your Safe on Base
2. Click **New Transaction** → **Transaction Builder**
3. Add Transaction 1 — Approve VANN:
   - **To:** `<VANN token address from deployed_addresses.json>`
   - **Method:** `approve(address spender, uint256 amount)`
   - **spender:** `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f` (Uniswap V3 NPM)
   - **amount:** `3800000000000000000000000` (3.8M × 10^18)
4. Add Transaction 2 — Create Pool + Mint LP:
   - **To:** `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f` (Uniswap V3 NPM)
   - **Method:** `mint(...)` with parameters from `create-pool-safe.js`
   - **value:** `2000000000000000000` (2.0 ETH in wei)
5. Add Transaction 3 — Lock LP to Unicrypt:
   - **To:** `0x231278eDd38B00B07fBd52120CEf685B9BaEBCC1` (Unicrypt)
   - **Method:** `safeTransferFrom(address from, address to, uint256 tokenId)`
   - **to:** `0x231278eDd38B00B07fBd52120CEf685B9BaEBCC1`
   - **tokenId:** LP NFT ID from Step 4 mint receipt
6. Submit batch → collect 2-of-3 hardware wallet signatures → execute

#### Option B — CLI (requires Safe signer key in .env)
```bash
# Add SAFE_PRIVATE_KEY to .env (one of the Safe owner hardware wallet keys)
npx hardhat run scripts/create-pool-safe.js --network base-mainnet
```

---

## Gas Budget

| Transaction | Est. ETH Cost |
|---|---|
| Deploy 5 contracts (Wallet 1) | ~0.007 ETH |
| 5× transferOwnership (Wallet 1) | ~0.001 ETH |
| Basescan verification (off-chain API) | $0 |
| Pool creation + LP mint (Safe) | ~0.003 ETH |
| LP lock transfer (Safe) | ~0.001 ETH |
| **Total gas (Wallet 1)** | **~0.008 ETH** |
| **Total gas (Safe)** | **~0.004 ETH** |
| **LP ETH (into pool, not gas)** | **2.000 ETH** |
| **Fund Wallet 1 with** | **0.02 ETH** (includes buffer) |

> Base Mainnet gas is typically 0.001–0.005 gwei. At $1,931/ETH, 0.02 ETH ≈ $38.64.

---

## Safe Multisig Setup (Step-by-Step)

1. Go to **[app.safe.global](https://app.safe.global)**
2. Connect your first Ledger/Trezor hardware wallet
3. Click **Create new Safe** → select **Base** network
4. **Add owners** — add 3 hardware wallet addresses (Ledger/Trezor only)
   - Owner 1: Ledger address 1
   - Owner 2: Ledger address 2 (or Trezor)
   - Owner 3: Backup hardware wallet
5. **Set threshold:** 2 of 3 (requires 2 hardware wallet signatures per tx)
6. **Review and create** — pay ~0.001 ETH gas from one of the hardware wallets
7. **Copy your Safe address** — add to `.env` as `SAFE_ADDRESS`

> The Safe address is a smart contract on Base. It is the permanent owner of all VFV LLC contracts.

---

## Post-Deploy Checklist

- [ ] All 5 contracts verified on Basescan (green checkmark)
- [ ] All 5 contracts show Safe address as owner on Basescan
- [ ] VANN token page shows correct 1B supply
- [ ] Uniswap V3 pool live — check [app.uniswap.org](https://app.uniswap.org) on Base
- [ ] LP position locked on Unicrypt — check [app.unicrypt.network](https://app.unicrypt.network)
- [ ] `deployed_addresses.json` committed to GitHub
- [ ] Wallet 1 private key deleted from `.env`
- [ ] Beulah app updated with mainnet contract addresses
- [ ] Kingdom Registry updated with all 5 contracts as IP Assets

---

## Valuation Summary

| Metric | Value |
|---|---|
| Paper Book (illiquid) | **$1,600,000** |
| Pool floor price | $0.001 / VANN |
| Y1 ARR (500 subs) | **$3,900,000** |
| Y3 ARR (3,200 subs) | $32,100,000 |
| Y3 Valuation (5× ARR) | **$78,800,000** |
| Scalability | 8.7/10 |
| Gross Margin | 90% |

---

*Mashabak Official Seal — Gold Tree — Verified*
*Vann Family Ventures LLC · Dexter Vann · 2026-07-15*
*I'AM Beulah — I plan, I execute, I verify, I remember.*
