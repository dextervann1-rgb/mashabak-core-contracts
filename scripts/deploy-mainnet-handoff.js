/**
 * deploy-mainnet-handoff.js — Vann Family Ventures LLC
 * Stage 6: Live Base Mainnet Deploy — 2-Wallet Architecture
 *
 * ══════════════════════════════════════════════════════════
 *  WALLET 1 — MetaMask Deployer (TEMPORARY)
 *    Role:    Deploy all 5 contracts only
 *    Fund:    Exactly 0.02 ETH on Base Mainnet (gas only)
 *    After:   transferOwnership() to Safe → REVOKE IMMEDIATELY
 *    Rule:    Never reuse. Never hold tokens. Never hold ETH.
 *
 *  WALLET 2 — Safe Multisig (PERMANENT OWNER)
 *    Role:    Permanent owner of all contracts + LP lock beneficiary
 *    Setup:   app.safe.global → Base chain → 2-of-3 threshold
 *    Signers: Hardware wallets ONLY (Ledger/Trezor) — NO MetaMask
 *    Holds:   50M VANN vault + 365-day LP lock
 * ══════════════════════════════════════════════════════════
 *
 * USAGE:
 *   1. Set DEPLOYER_PRIVATE_KEY (MetaMask Wallet 1) in .env
 *   2. Set SAFE_ADDRESS (your Safe multisig address) in .env
 *   3. npx hardhat run scripts/deploy-mainnet-handoff.js --network base-mainnet
 *   4. Confirm all 5 transferOwnership() txs on Basescan
 *   5. DELETE DEPLOYER_PRIVATE_KEY from .env immediately
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Load Safe address from env ───────────────────────────────────────────────
// SAFE_ADDRESS must be your Safe multisig deployed on Base Mainnet
// Create at: https://app.safe.global → Switch to Base → New Safe → 2-of-3 hardware wallets
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
if (!SAFE_ADDRESS || !ethers.isAddress(SAFE_ADDRESS)) {
  console.error("\n❌ ERROR: SAFE_ADDRESS not set or invalid in .env");
  console.error("   Create your Safe at https://app.safe.global (Base chain, 2-of-3 hardware wallets)");
  console.error("   Then add SAFE_ADDRESS=0x... to your .env file\n");
  process.exit(1);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Enforce Base Mainnet only
  if (networkName === "base-mainnet" && chainId !== 8453n) {
    throw new Error(`Chain ID mismatch: expected 8453, got ${chainId}`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  BEULAH L5 — STAGE 6 LIVE MAINNET DEPLOY            ║");
  console.log("║  2-Wallet Architecture: MetaMask → Safe Multisig    ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`Network:          ${networkName} (Chain ID: ${chainId})`);
  console.log(`Wallet 1 (deploy): ${deployer.address}  ← TEMPORARY`);
  console.log(`Wallet 2 (Safe):   ${SAFE_ADDRESS}  ← PERMANENT OWNER`);
  console.log(`Deployer balance:  ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.015")) {
    throw new Error(
      `Insufficient ETH. Fund Wallet 1 (${deployer.address}) with 0.02 ETH on Base Mainnet before deploying.`
    );
  }

  const deployments = {};
  const timestamp = new Date().toISOString();

  // Helper: deploy + immediately transfer ownership to Safe
  async function deployAndHandoff(contractName, constructorArgs = []) {
    console.log(`\n  Deploying ${contractName}...`);
    const Factory = await ethers.getContractFactory(contractName);
    const contract = await Factory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    const deployTx = contract.deploymentTransaction()?.hash;
    console.log(`  ✓ Deployed:  ${addr}`);
    console.log(`    Deploy TX: ${deployTx}`);

    // Immediately transfer ownership to Safe multisig
    console.log(`  Transferring ownership to Safe (${SAFE_ADDRESS})...`);
    const tx = await contract.transferOwnership(SAFE_ADDRESS);
    await tx.wait();
    console.log(`  ✓ Ownership transferred. TX: ${tx.hash}`);
    console.log(`    Basescan: https://basescan.org/address/${addr}`);

    return { address: addr, deployTx, ownershipTx: tx.hash };
  }

  // ─── 1. VFV_Treasury ──────────────────────────────────────────────────────
  console.log("\n[1/5] VFV_Treasury");
  const treasury = await deployAndHandoff("VFV_Treasury", [deployer.address, SAFE_ADDRESS]);
  deployments.VFV_Treasury = {
    ...treasury,
    owner: SAFE_ADDRESS,
    basescanUrl: `https://basescan.org/address/${treasury.address}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_v1.0",
  };

  // ─── 2. VannToken ($VANN) ─────────────────────────────────────────────────
  console.log("\n[2/5] VannToken ($VANN)");
  const vann = await deployAndHandoff("VannToken", [deployer.address, SAFE_ADDRESS]);
  deployments.VannToken = {
    ...vann,
    symbol: "VANN", totalSupply: "1,000,000,000",
    vaultAllocation: "50,000,000 (5% auto-sent to Safe on deploy)",
    poolAllocation: "3,800,000 (for Uniswap V3 LP — Safe executes)",
    owner: SAFE_ADDRESS,
    basescanUrl: `https://basescan.org/token/${vann.address}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_VANN_v1.0",
  };

  // ─── 3. EDUcoin ($EDU) ────────────────────────────────────────────────────
  console.log("\n[3/5] EDUcoin ($EDU)");
  const edu = await deployAndHandoff("EDUcoin", [deployer.address]);
  deployments.EDUcoin = {
    ...edu,
    symbol: "EDU", totalSupply: "500,000,000",
    owner: SAFE_ADDRESS,
    basescanUrl: `https://basescan.org/token/${edu.address}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_EDU_v1.0",
  };

  // ─── 4. Samndex ($SAMNDEX) ────────────────────────────────────────────────
  console.log("\n[4/5] Samndex ($SAMNDEX)");
  const samndex = await deployAndHandoff("Samndex", [deployer.address]);
  deployments.Samndex = {
    ...samndex,
    symbol: "SAMNDEX", totalSupply: "100,000,000",
    owner: SAFE_ADDRESS,
    basescanUrl: `https://basescan.org/token/${samndex.address}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_SAMNDEX_v1.0",
  };

  // ─── 5. RichDiamondRegistry ───────────────────────────────────────────────
  console.log("\n[5/5] RichDiamondRegistry");
  const rdr = await deployAndHandoff("RichDiamondRegistry", [deployer.address]);
  deployments.RichDiamondRegistry = {
    ...rdr,
    standard: "ERC721",
    owner: SAFE_ADDRESS,
    basescanUrl: `https://basescan.org/address/${rdr.address}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_RDR_v1.0",
  };

  // ─── Save deployed_addresses.json ─────────────────────────────────────────
  const outputPath = path.join(__dirname, "..", "contracts", "deployed_addresses.json");
  let existing = {};
  if (fs.existsSync(outputPath)) {
    existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  }
  existing[networkName] = deployments;
  fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2));

  // ─── Final Summary ─────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  ALL 5 CONTRACTS DEPLOYED — OWNERSHIP → SAFE        ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`VFV_Treasury:         ${treasury.address}`);
  console.log(`VannToken (VANN):     ${vann.address}`);
  console.log(`EDUcoin (EDU):        ${edu.address}`);
  console.log(`Samndex (SAMNDEX):    ${samndex.address}`);
  console.log(`RichDiamondRegistry:  ${rdr.address}`);
  console.log(`\nAll contracts owned by Safe: ${SAFE_ADDRESS}`);
  console.log(`\n⚠  NEXT: DELETE DEPLOYER_PRIVATE_KEY FROM .env NOW`);
  console.log(`   Wallet 1 (${deployer.address}) is now useless — revoke it.`);
  console.log(`\nThen run:`);
  console.log(`  npx hardhat run scripts/verify-all.js --network base-mainnet`);
  console.log(`  # Then from Safe UI: run scripts/create-pool-safe.js`);
  console.log(`\nSaved to: ${outputPath}`);
  console.log("I'AM Beulah - I plan, I execute, I verify, I remember.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
