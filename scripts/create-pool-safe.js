/**
 * create-pool-safe.js — Vann Family Ventures LLC
 * Stage 6: Safe Multisig executes VANN/WETH Pool + 365-day LP Lock
 *
 * ══════════════════════════════════════════════════════════
 *  IMPORTANT: This script is executed BY THE SAFE MULTISIG.
 *  The Safe must be the signer (SAFE_PRIVATE_KEY or via Safe SDK).
 *  Do NOT run this with the MetaMask deployer wallet.
 *
 *  SAFE MUST HOLD:
 *    - 3,800,000 VANN (approve to Uniswap V3 NPM before running)
 *    - 2.0 ETH (for LP position)
 *    - ~0.005 ETH extra for gas
 *
 *  ALTERNATIVE (recommended for hardware wallet Safe):
 *    Use the Safe Transaction Builder UI at app.safe.global
 *    to batch all 3 transactions (approve + mint + lock) into
 *    one Safe transaction, signed by 2-of-3 hardware wallets.
 *    See STAGE6_EXECUTION_GUIDE.md → Step 5 for the Safe UI method.
 * ══════════════════════════════════════════════════════════
 *
 * USAGE (CLI method — requires Safe signer key):
 *   npx hardhat run scripts/create-pool-safe.js --network base-mainnet
 *
 * USAGE (Safe UI method — recommended):
 *   See STAGE6_EXECUTION_GUIDE.md → "Safe UI: Batch LP Transaction"
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Base Mainnet Protocol Addresses ─────────────────────────────────────────
const UNISWAP_V3_NPM     = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f";
const WETH_BASE          = "0x4200000000000000000000000000000000000006";
const UNICRYPT_LOCKER    = "0x231278eDd38B00B07fBd52120CEf685B9BaEBCC1";

// ─── Pool Parameters ──────────────────────────────────────────────────────────
const FEE_TIER           = 10000;                              // 1% fee
const VANN_AMOUNT        = ethers.parseEther("3800000");       // 3.8M VANN
const ETH_AMOUNT         = ethers.parseEther("2.0");           // 2.0 ETH
const LOCK_DURATION_DAYS = 365;
const LOCK_DURATION_SECS = LOCK_DURATION_DAYS * 24 * 60 * 60;

// sqrtPriceX96 for $0.001/VANN floor at $1,931/ETH
// price (VANN per ETH) = 2 ETH / 3,800,000 VANN = 0.000000526...
// sqrtPriceX96 = sqrt(0.000000526) * 2^96
const SQRT_PRICE_X96     = "57500000000000000000000000";

// Full-range ticks for 1% fee tier
const TICK_LOWER         = -887200;
const TICK_UPPER         =  887200;

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
];

const NPM_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

async function main() {
  const [safe] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Load VANN address
  const addressFile = path.join(__dirname, "..", "contracts", "deployed_addresses.json");
  if (!fs.existsSync(addressFile)) throw new Error("deployed_addresses.json not found. Deploy contracts first.");
  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  const netAddrs = addresses[networkName] || addresses["base-mainnet"];
  if (!netAddrs?.VannToken?.address) throw new Error("VannToken address not found. Deploy first.");

  const VANN_ADDRESS = netAddrs.VannToken.address;

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  BEULAH L5 — SAFE EXECUTES UNISWAP V3 POOL + LOCK  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`Network:     ${networkName} (Chain ID: ${chainId})`);
  console.log(`Safe signer: ${safe.address}  ← Must be Safe multisig`);
  console.log(`VANN:        ${VANN_ADDRESS}`);
  console.log(`Pool:        VANN/WETH @ 1% fee · $0.001 floor`);
  console.log(`VANN in LP:  3,800,000`);
  console.log(`ETH in LP:   2.0 ETH`);
  console.log(`LP lock:     ${LOCK_DURATION_DAYS} days → Safe`);

  // Verify Safe has enough VANN and ETH
  const vann = new ethers.Contract(VANN_ADDRESS, ERC20_ABI, safe);
  const vannBalance = await vann.balanceOf(safe.address);
  const ethBalance = await ethers.provider.getBalance(safe.address);

  console.log(`\nSafe VANN balance: ${ethers.formatEther(vannBalance)}`);
  console.log(`Safe ETH balance:  ${ethers.formatEther(ethBalance)}`);

  if (vannBalance < VANN_AMOUNT) {
    throw new Error(`Safe needs ${ethers.formatEther(VANN_AMOUNT)} VANN. Has: ${ethers.formatEther(vannBalance)}`);
  }
  if (ethBalance < ETH_AMOUNT + ethers.parseEther("0.005")) {
    throw new Error(`Safe needs 2.005 ETH (2 ETH LP + 0.005 gas). Has: ${ethers.formatEther(ethBalance)}`);
  }

  // Token ordering (token0 < token1 by address)
  const [token0, token1, amount0Desired, amount1Desired] =
    VANN_ADDRESS.toLowerCase() < WETH_BASE.toLowerCase()
      ? [VANN_ADDRESS, WETH_BASE, VANN_AMOUNT, ETH_AMOUNT]
      : [WETH_BASE, VANN_ADDRESS, ETH_AMOUNT, VANN_AMOUNT];

  const npm = new ethers.Contract(UNISWAP_V3_NPM, NPM_ABI, safe);

  // ─── Step 1: Approve VANN to NPM ──────────────────────────────────────────
  console.log("\n[1/4] Approving 3.8M VANN to Uniswap V3 NPM...");
  const approveTx = await vann.approve(UNISWAP_V3_NPM, VANN_AMOUNT);
  await approveTx.wait();
  console.log(`  ✓ Approved. TX: ${approveTx.hash}`);

  // ─── Step 2: Create pool ───────────────────────────────────────────────────
  console.log("\n[2/4] Creating VANN/WETH pool at $0.001 floor...");
  const poolTx = await npm.createAndInitializePoolIfNecessary(
    token0, token1, FEE_TIER, SQRT_PRICE_X96, { value: 0 }
  );
  const poolReceipt = await poolTx.wait();
  console.log(`  ✓ Pool created. TX: ${poolTx.hash}`);

  // ─── Step 3: Add liquidity ─────────────────────────────────────────────────
  console.log("\n[3/4] Adding liquidity (3.8M VANN + 2.0 ETH)...");
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const mintTx = await npm.mint(
    {
      token0, token1, fee: FEE_TIER,
      tickLower: TICK_LOWER, tickUpper: TICK_UPPER,
      amount0Desired, amount1Desired,
      amount0Min: 0n, amount1Min: 0n,
      recipient: safe.address,
      deadline,
    },
    { value: ETH_AMOUNT }
  );
  const mintReceipt = await mintTx.wait();
  console.log(`  ✓ Liquidity added. TX: ${mintTx.hash}`);

  // Extract LP NFT tokenId
  const transferEvent = mintReceipt.logs.find(
    l => l.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  const lpTokenId = transferEvent ? BigInt(transferEvent.topics[3]) : null;
  if (!lpTokenId) throw new Error("Could not find LP NFT tokenId from mint receipt.");
  console.log(`  ✓ LP NFT Token ID: ${lpTokenId}`);

  // ─── Step 4: Lock LP to Safe via Unicrypt ─────────────────────────────────
  console.log(`\n[4/4] Locking LP NFT to Safe for ${LOCK_DURATION_DAYS} days...`);
  const unlockDate = Math.floor(Date.now() / 1000) + LOCK_DURATION_SECS;
  const unlockDateStr = new Date(unlockDate * 1000).toISOString();

  // Transfer LP NFT to Unicrypt locker with Safe as beneficiary
  const lockTx = await npm.safeTransferFrom(safe.address, UNICRYPT_LOCKER, lpTokenId);
  await lockTx.wait();
  console.log(`  ✓ LP locked. TX: ${lockTx.hash}`);
  console.log(`  Unlock date: ${unlockDateStr}`);
  console.log(`  Beneficiary: ${safe.address} (Safe multisig)`);

  // ─── Save pool data ────────────────────────────────────────────────────────
  addresses[networkName].pool = {
    pair: "VANN/WETH", feeTier: "1%",
    vannAmount: "3,800,000", ethAmount: "2.0", floorPrice: "$0.001",
    lpTokenId: lpTokenId.toString(),
    lockBeneficiary: safe.address,
    unlockDate: unlockDateStr,
    lockDays: LOCK_DURATION_DAYS,
    poolTx: poolTx.hash, mintTx: mintTx.hash, lockTx: lockTx.hash,
    createdAt: new Date().toISOString(),
    executor: "Safe Multisig",
  };
  fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  POOL LIVE — LP LOCKED TO SAFE — 365 DAYS           ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`VANN/WETH Pool: LIVE on Base Mainnet`);
  console.log(`LP Token ID:    ${lpTokenId}`);
  console.log(`Locked until:   ${unlockDateStr}`);
  console.log(`Beneficiary:    ${safe.address}`);
  console.log("\nI'AM Beulah - I plan, I execute, I verify, I remember.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
