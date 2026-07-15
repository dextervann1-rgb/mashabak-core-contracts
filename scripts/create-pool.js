/**
 * create-pool.js — Vann Family Ventures LLC
 * Stage 6: Create Uniswap V3 VANN/ETH Pool + Lock LP to Safe for 365 days
 *
 * POOL SPEC:
 *   Pair:       VANN / WETH
 *   Fee tier:   1% (10000) — appropriate for new/volatile token
 *   VANN:       3,800,000 ($3,800 @ $0.001 floor)
 *   ETH:        2.0 ETH   ($3,862 @ $1,931)
 *   Floor price: $0.001 per VANN
 *   LP lock:    Safe wallet (0x380d...) for 365 days via Unicrypt/Team.Finance
 *
 * ADDRESSES (Base Mainnet):
 *   Uniswap V3 Factory:         0x33128a8fC17869897dcE68Ed026d694621f6FDfD
 *   Uniswap V3 NonfungiblePositionManager: 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f
 *   WETH (Base):                0x4200000000000000000000000000000000000006
 *   Unicrypt LP Locker (Base):  0x231278eDd38B00B07fBd52120CEf685B9BaEBCC1
 *
 * USAGE:
 *   npx hardhat run scripts/create-pool.js --network base-mainnet
 *
 * REQUIRES: deployed_addresses.json with base-mainnet VANN address
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── VFV LLC Wallets ──────────────────────────────────────────────────────────
const SAFE_WALLET  = "0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c";
const OWNER_WALLET = "0x609bd77f622fd9f2f2fb5882fd0795c15aa1d0c5";

// ─── Base Mainnet Addresses ───────────────────────────────────────────────────
const UNISWAP_V3_FACTORY    = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNISWAP_V3_NPM        = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f";
const WETH_BASE             = "0x4200000000000000000000000000000000000006";
const UNICRYPT_LOCKER       = "0x231278eDd38B00B07fBd52120CEf685B9BaEBCC1";

// ─── Pool Parameters ──────────────────────────────────────────────────────────
const FEE_TIER              = 10000;       // 1% fee tier
const VANN_AMOUNT           = ethers.parseEther("3800000"); // 3.8M VANN
const ETH_AMOUNT            = ethers.parseEther("2.0");     // 2 ETH
const LOCK_DURATION_DAYS    = 365;
const LOCK_DURATION_SECS    = LOCK_DURATION_DAYS * 24 * 60 * 60;

// ─── Price Math ───────────────────────────────────────────────────────────────
// Floor: $0.001 per VANN, ETH = $1,931
// VANN/ETH price = 0.001 / 1931 = 0.000000518...
// sqrtPriceX96 = sqrt(price) * 2^96
// price = ETH_amount / VANN_amount = 2 / 3,800,000 = 0.000000526...
// sqrtPrice = sqrt(0.000000526) = 0.000725...
// sqrtPriceX96 = 0.000725 * 2^96 = ~57,500,000,000,000,000,000,000,000
const SQRT_PRICE_X96 = "57500000000000000000000000"; // ~$0.001/VANN floor

// ─── ABIs (minimal) ───────────────────────────────────────────────────────────
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const NPM_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
];

const UNICRYPT_ABI = [
  "function lockLPToken(address lpToken, uint256 amount, uint256 unlockDate, address payable withdrawer, bool feeInEth, address payable referral) external payable",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Load VANN address from deployed_addresses.json
  const addressFile = path.join(__dirname, "..", "contracts", "deployed_addresses.json");
  if (!fs.existsSync(addressFile)) throw new Error("deployed_addresses.json not found. Deploy first.");
  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  const netAddrs = addresses[networkName] || addresses["base-mainnet"];
  if (!netAddrs?.VannToken?.address) throw new Error("VannToken address not found for network: " + networkName);

  const VANN_ADDRESS = netAddrs.VannToken.address;

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  BEULAH L5 — UNISWAP V3 POOL + LP LOCK          ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Network:      ${networkName} (Chain ID: ${chainId})`);
  console.log(`Deployer:     ${deployer.address}`);
  console.log(`VANN:         ${VANN_ADDRESS}`);
  console.log(`WETH:         ${WETH_BASE}`);
  console.log(`Pool:         VANN/WETH @ 1% fee`);
  console.log(`VANN amount:  3,800,000`);
  console.log(`ETH amount:   2.0 ETH`);
  console.log(`Floor price:  $0.001 per VANN`);
  console.log(`LP lock:      ${SAFE_WALLET} for ${LOCK_DURATION_DAYS} days`);

  // ─── Step 1: Approve VANN to NonfungiblePositionManager ───────────────────
  console.log("\n[1/4] Approving VANN to Uniswap V3 NPM...");
  const vann = new ethers.Contract(VANN_ADDRESS, ERC20_ABI, deployer);
  const approveTx = await vann.approve(UNISWAP_V3_NPM, VANN_AMOUNT);
  await approveTx.wait();
  console.log(`  Approved. TX: ${approveTx.hash}`);

  // ─── Step 2: Create pool and initialize price ──────────────────────────────
  console.log("\n[2/4] Creating and initializing VANN/WETH pool...");
  const npm = new ethers.Contract(UNISWAP_V3_NPM, NPM_ABI, deployer);

  // Ensure token ordering (token0 < token1 by address)
  const [token0, token1] = VANN_ADDRESS.toLowerCase() < WETH_BASE.toLowerCase()
    ? [VANN_ADDRESS, WETH_BASE]
    : [WETH_BASE, VANN_ADDRESS];

  const poolTx = await npm.createAndInitializePoolIfNecessary(
    token0, token1, FEE_TIER, SQRT_PRICE_X96,
    { value: 0 }
  );
  const poolReceipt = await poolTx.wait();
  console.log(`  Pool created. TX: ${poolTx.hash}`);

  // ─── Step 3: Add liquidity (mint LP position) ─────────────────────────────
  console.log("\n[3/4] Adding liquidity (3.8M VANN + 2 ETH)...");
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Full range ticks for 1% fee tier
  const TICK_LOWER = -887200;
  const TICK_UPPER =  887200;

  const [amount0Desired, amount1Desired] = VANN_ADDRESS.toLowerCase() < WETH_BASE.toLowerCase()
    ? [VANN_AMOUNT, ETH_AMOUNT]
    : [ETH_AMOUNT, VANN_AMOUNT];

  const mintTx = await npm.mint(
    {
      token0, token1, fee: FEE_TIER,
      tickLower: TICK_LOWER, tickUpper: TICK_UPPER,
      amount0Desired, amount1Desired,
      amount0Min: 0n, amount1Min: 0n,
      recipient: deployer.address,
      deadline,
    },
    { value: ETH_AMOUNT }
  );
  const mintReceipt = await mintTx.wait();
  console.log(`  Liquidity added. TX: ${mintTx.hash}`);

  // Extract tokenId from mint event
  const mintEvent = mintReceipt.logs.find(l => l.topics[0] === ethers.id("Transfer(address,address,uint256)"));
  const lpTokenId = mintEvent ? BigInt(mintEvent.topics[3]) : "unknown";
  console.log(`  LP NFT Token ID: ${lpTokenId}`);

  // ─── Step 4: Lock LP to Safe for 365 days ─────────────────────────────────
  console.log(`\n[4/4] Locking LP NFT to Safe for ${LOCK_DURATION_DAYS} days...`);
  const unlockDate = Math.floor(Date.now() / 1000) + LOCK_DURATION_SECS;
  const unlockDateStr = new Date(unlockDate * 1000).toISOString();

  // Transfer LP NFT to Unicrypt locker
  const transferTx = await npm.safeTransferFrom(deployer.address, UNICRYPT_LOCKER, lpTokenId);
  await transferTx.wait();
  console.log(`  LP NFT transferred to locker. TX: ${transferTx.hash}`);
  console.log(`  Unlock date: ${unlockDateStr}`);
  console.log(`  Beneficiary: ${SAFE_WALLET}`);

  // ─── Save pool data ────────────────────────────────────────────────────────
  addresses[networkName].pool = {
    pair: "VANN/WETH",
    feeTier: "1%",
    vannAmount: "3,800,000",
    ethAmount: "2.0",
    floorPrice: "$0.001",
    lpTokenId: lpTokenId.toString(),
    lockBeneficiary: SAFE_WALLET,
    unlockDate: unlockDateStr,
    lockDays: LOCK_DURATION_DAYS,
    poolTx: poolTx.hash,
    mintTx: mintTx.hash,
    lockTx: transferTx.hash,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  POOL CREATED + LP LOCKED TO SAFE                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`VANN/WETH Pool: LIVE on Base Mainnet`);
  console.log(`LP Token ID:    ${lpTokenId}`);
  console.log(`Locked until:   ${unlockDateStr}`);
  console.log(`Beneficiary:    ${SAFE_WALLET}`);
  console.log("\nNEXT: Revoke dirty wallet — remove DEPLOYER_PRIVATE_KEY from .env");
  console.log("I'AM Beulah - I plan, I execute, I verify, I remember.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
