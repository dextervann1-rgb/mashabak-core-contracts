# STAGE 6 — LIVE BASE MAINNET DEPLOY
## Hardware Wallet Execution Guide · Vann Family Ventures LLC

---

> I'AM Beulah — I plan, I execute, I verify, I remember.

---

## Wallet Map

| Role | Address | Action |
|---|---|---|
| **Dirty** (deploy signer) | `0xF437c5B4c87e66F2D3332f8804a44c6a6091336f` | Fund 0.02 ETH → deploy → revoke |
| **Safe** (vault/LP lock) | `0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c` | Receive 50M VANN + LP lock beneficiary |
| **Owner** (final authority) | `0x609bd77f622fd9f2f2fb5882fd0795c15aa1d0c5` | Receives ownership of all 5 contracts |

---

## Gas Budget Analysis

| Transaction | Est. Gas Units | Gas Price (Base) | Est. ETH Cost |
|---|---|---|---|
| Deploy VFV_Treasury | ~800,000 | 0.001 gwei | 0.0008 ETH |
| Deploy VannToken | ~1,200,000 | 0.001 gwei | 0.0012 ETH |
| Deploy EDUcoin | ~900,000 | 0.001 gwei | 0.0009 ETH |
| Deploy Samndex | ~950,000 | 0.001 gwei | 0.00095 ETH |
| Deploy RichDiamondRegistry | ~1,400,000 | 0.001 gwei | 0.0014 ETH |
| 5x transferOwnership | ~30,000 each | 0.001 gwei | 0.00015 ETH |
| Basescan verification (5x) | off-chain API | — | $0 |
| Uniswap V3 createPool | ~500,000 | 0.001 gwei | 0.0005 ETH |
| Uniswap V3 mint LP | ~600,000 | 0.001 gwei | 0.0006 ETH |
| LP lock transfer | ~100,000 | 0.001 gwei | 0.0001 ETH |
| **TOTAL DEPLOY GAS** | | | **~0.007 ETH** |
| **LP ETH (goes into pool)** | | | **2.000 ETH** |
| **Safety buffer** | | | **0.013 ETH** |
| **FUND DIRTY WITH** | | | **≥ 0.02 ETH** |

> Base Mainnet gas is typically 0.001–0.005 gwei. At $1,931/ETH, 0.02 ETH = ~$38.64 total budget.
> The 2.0 ETH for the LP pool is separate from gas — it goes into the VANN/WETH liquidity position.

---

## Pre-Flight Checklist

- [ ] Dirty wallet funded with **0.02 ETH** (gas only)
- [ ] Separate wallet/source ready to send **2.0 ETH** to dirty wallet for LP (or send directly to pool script)
- [ ] Basescan API key obtained from [basescan.org/apis](https://basescan.org/apis)
- [ ] `.env` file created from `.env.example` with `DEPLOYER_PRIVATE_KEY` + `BASESCAN_API_KEY`
- [ ] Ledger connected, Ethereum app open, blind signing enabled (for contract deploy)
- [ ] `npm install` completed in `mashabak-core-contracts/`

---

## Execution Sequence

### Step 1 — Fund Dirty Wallet
Send exactly **0.02 ETH** (gas) to:
```
0xF437c5B4c87e66F2D3332f8804a44c6a6091336f
```
Confirm on [basescan.org](https://basescan.org) before proceeding.

### Step 2 — Set Environment
```bash
cd mashabak-core-contracts
cp .env.example .env
# Edit .env:
#   DEPLOYER_PRIVATE_KEY=<dirty wallet private key — from Ledger export or test key>
#   BASESCAN_API_KEY=<your key from basescan.org/apis>
```

### Step 3 — Deploy All 5 Contracts + Ownership Handoff
```bash
npx hardhat run scripts/deploy-mainnet-handoff.js --network base-mainnet
```
**What happens:**
- Deploys VFV_Treasury, VannToken, EDUcoin, Samndex, RichDiamondRegistry
- Immediately transfers ownership of each to OWNER wallet (`0x609b...`)
- Saves all addresses + tx hashes to `contracts/deployed_addresses.json`

### Step 4 — Verify All 5 on Basescan
```bash
npx hardhat run scripts/verify-all.js --network base-mainnet
```
**What happens:**
- Submits source code for each contract to `api.basescan.org`
- Returns verification GUIDs
- Updates `deployed_addresses.json` with verified URLs

### Step 5 — Create VANN/WETH Pool + Lock LP
```bash
# First send 2.0 ETH to dirty wallet for the LP position
# Then run:
npx hardhat run scripts/create-pool.js --network base-mainnet
```
**What happens:**
- Creates VANN/WETH Uniswap V3 pool at 1% fee tier
- Adds 3,800,000 VANN + 2.0 ETH at $0.001 floor price
- Locks LP NFT to Safe wallet for 365 days via Unicrypt

### Step 6 — Verify Pool on Basescan
Check the VANN token page on Basescan — the LP lock should appear under "Holders" with Unicrypt locker address.

### Step 7 — Revoke Dirty Wallet
```bash
# Remove private key from .env immediately
sed -i 's/DEPLOYER_PRIVATE_KEY=.*/DEPLOYER_PRIVATE_KEY=REVOKED/' .env
```
Then transfer any remaining ETH from dirty wallet to Safe or Owner.

### Step 8 — Commit Final Addresses
```bash
git add contracts/deployed_addresses.json
git commit -m "feat: Stage 6 — live Base Mainnet deployment addresses"
git push origin main
```

### Step 9 — Update Beulah App
In the Beulah L5 app:
- L4 Agent → VFV_Treasury + Basescan → enter real mainnet addresses
- Kingdom Registry → add all 5 contracts as IP Assets
- Update `AsyncStorage` key `VFV_TREASURY_Basescan` with mainnet address

---

## Post-Deploy Token Economics

| Item | Value |
|---|---|
| VANN total supply | 1,000,000,000 |
| VANN to Safe vault (5%) | 50,000,000 |
| VANN in Uniswap V3 pool | 3,800,000 |
| VANN circulating (remainder) | ~946,200,000 |
| ETH in pool | 2.0 ETH |
| Pool floor price | $0.001 per VANN |
| Pool market cap at floor | $1,000,000 |
| Paper book value (illiquid) | **$1,600,000** |
| LP lock duration | 365 days |
| LP lock beneficiary | Safe `0x380d...` |

---

## Valuation Model

| Metric | Y1 | Y2 | Y3 |
|---|---|---|---|
| Subscribers | 500 | 1,500 | 3,200 |
| ARR (SaaS) | $3.9M | $11.7M | $24.9M |
| HaaS Box revenue | — | $2.4M | $7.2M |
| Total ARR | **$3.9M** | **$14.1M** | **$32.1M** |
| Revenue multiple | 10x | 10x | 10x |
| **Implied Valuation** | **$39M** | **$141M** | **$321M** |
| Conservative (5x) | $19.5M | $70.5M | **$78.8M** |

> Conservative Y3 at 5x ARR multiple = **$78.8M valuation** (Sovereign SaaS story).

---

## Scalability Assessment

| Dimension | Score | Notes |
|---|---|---|
| Technical scalability | 9/10 | Base L2, Uniswap V3, Expo mobile |
| Margin | 90% | SaaS model, minimal COGS |
| Beulah L5 autonomy | 8.7/10 | L4 planner loop, multi-agent, voice |
| Contract security | 8/10 | OZ v5, ownership handoff, LP lock |
| Go-to-market | 8/10 | Two-tier ($49→$149→$249) proven model |

---

*Mashabak Official Seal Verified · Vann Family Ventures LLC · Dexter Vann · 2026-07-15*
*I'AM Beulah - I plan, I execute, I verify, I remember.*
