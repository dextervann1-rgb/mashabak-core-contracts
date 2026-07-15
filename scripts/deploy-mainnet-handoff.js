/**
 * deploy-mainnet-handoff.js — Vann Family Ventures LLC
 * Stage 6: Live Base Mainnet Deploy with 3-Wallet Handoff
 *
 * WALLET ROLES:
 *   DIRTY  0xF437c5B4c87e66F2D3332f8804a44c6a6091336f  Deploy signer (burn after use)
 *   SAFE   0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c  Vault / LP lock receiver
 *   OWNER  0x609bd77f622fd9f2f2fb5882fd0795c15aa1d0c5  Final permanent owner
 *
 * SEQUENCE:
 *   1. Dirty wallet deploys all 5 contracts (owns them temporarily)
 *   2. Dirty wallet transfers ownership of each contract to OWNER
 *   3. Dirty wallet sends 5% VANN vault allocation to SAFE
 *   4. Record all addresses + tx hashes
 *   5. (Manual) Revoke dirty wallet after confirmation
 *
 * USAGE:
 *   npx hardhat run scripts/deploy-mainnet-handoff.js --network base-mainnet
 *
 * REQUIRES: DEPLOYER_PRIVATE_KEY + BASESCAN_API_KEY in .env
 * GAS BUDGET: ~0.02 ETH at current Base gas prices
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── VFV LLC Wallet Addresses ─────────────────────────────────────────────────
const DIRTY_WALLET  = "0xF437c5B4c87e66F2D3332f8804a44c6a6091336f"; // deploy signer
const SAFE_WALLET   = "0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c"; // vault / LP lock
const OWNER_WALLET  = "0x609bd77f622fd9f2f2fb5882fd0795c15aa1d0c5"; // final owner

// ─── Token Economics ──────────────────────────────────────────────────────────
const VANN_TOTAL_SUPPLY   = ethers.parseEther("1000000000"); // 1B VANN
const VANN_VAULT_PCT      = 5n;                               // 5% to Safe
const VANN_VAULT_AMOUNT   = VANN_TOTAL_SUPPLY * VANN_VAULT_PCT / 100n; // 50M VANN
const VANN_POOL_AMOUNT    = ethers.parseEther("3800000");    // 3.8M VANN for LP

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Safety check — confirm this is Base Mainnet
  if (networkName === "base-mainnet" && chainId !== 8453n) {
    throw new Error(`Chain ID mismatch: expected 8453, got ${chainId}`);
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  BEULAH L5 — STAGE 6 LIVE MAINNET DEPLOY        ║");
  console.log("║  I plan, I execute, I verify, I remember.        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Network:  ${networkName} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Dirty:    ${DIRTY_WALLET}`);
  console.log(`Safe:     ${SAFE_WALLET}`);
  console.log(`Owner:    ${OWNER_WALLET}`);

  // Verify deployer is the dirty wallet
  if (deployer.address.toLowerCase() !== DIRTY_WALLET.toLowerCase()) {
    console.warn(`\n⚠ WARNING: Deployer (${deployer.address}) does not match DIRTY_WALLET.`);
    console.warn("  Proceeding — ensure you intended this wallet as deployer.\n");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);
  if (balance < ethers.parseEther("0.015")) {
    throw new Error("Insufficient ETH. Fund dirty wallet with at least 0.02 ETH before deploying.");
  }

  const deployments = {};
  const timestamp = new Date().toISOString();

  // ─── 1. Deploy VFV_Treasury ────────────────────────────────────────────────
  console.log("\n[1/5] Deploying VFV_Treasury...");
  const VFVTreasury = await ethers.getContractFactory("VFV_Treasury");
  const treasury = await VFVTreasury.deploy(deployer.address, SAFE_WALLET);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`  Deployed: ${treasuryAddr}`);
  console.log(`  TX:       ${treasury.deploymentTransaction()?.hash}`);

  // Transfer ownership to OWNER
  console.log("  Transferring ownership to OWNER...");
  const txT = await treasury.transferOwnership(OWNER_WALLET);
  await txT.wait();
  console.log(`  Ownership transferred. TX: ${txT.hash}`);

  deployments.VFV_Treasury = {
    address: treasuryAddr,
    owner: OWNER_WALLET,
    deployTx: treasury.deploymentTransaction()?.hash,
    ownershipTx: txT.hash,
    basescanUrl: `https://basescan.org/address/${treasuryAddr}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_v1.0",
  };

  // ─── 2. Deploy VannToken ($VANN) ───────────────────────────────────────────
  console.log("\n[2/5] Deploying VannToken ($VANN)...");
  const VannToken = await ethers.getContractFactory("VannToken");
  const vann = await VannToken.deploy(deployer.address, SAFE_WALLET);
  await vann.waitForDeployment();
  const vannAddr = await vann.getAddress();
  console.log(`  Deployed: ${vannAddr}`);
  console.log(`  TX:       ${vann.deploymentTransaction()?.hash}`);

  // Transfer ownership to OWNER
  console.log("  Transferring ownership to OWNER...");
  const txV = await vann.transferOwnership(OWNER_WALLET);
  await txV.wait();
  console.log(`  Ownership transferred. TX: ${txV.hash}`);

  deployments.VannToken = {
    address: vannAddr, symbol: "VANN", totalSupply: "1,000,000,000",
    vaultAllocation: "50,000,000 (5% to Safe)",
    poolAllocation: "3,800,000 (for Uniswap V3 LP)",
    owner: OWNER_WALLET,
    deployTx: vann.deploymentTransaction()?.hash,
    ownershipTx: txV.hash,
    basescanUrl: `https://basescan.org/token/${vannAddr}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_VANN_v1.0",
  };

  // ─── 3. Deploy EDUcoin ─────────────────────────────────────────────────────
  console.log("\n[3/5] Deploying EDUcoin ($EDU)...");
  const EDUcoin = await ethers.getContractFactory("EDUcoin");
  const edu = await EDUcoin.deploy(deployer.address);
  await edu.waitForDeployment();
  const eduAddr = await edu.getAddress();
  console.log(`  Deployed: ${eduAddr}`);

  const txE = await edu.transferOwnership(OWNER_WALLET);
  await txE.wait();
  console.log(`  Ownership transferred. TX: ${txE.hash}`);

  deployments.EDUcoin = {
    address: eduAddr, symbol: "EDU", totalSupply: "500,000,000",
    owner: OWNER_WALLET,
    deployTx: edu.deploymentTransaction()?.hash,
    ownershipTx: txE.hash,
    basescanUrl: `https://basescan.org/token/${eduAddr}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_EDU_v1.0",
  };

  // ─── 4. Deploy Samndex ─────────────────────────────────────────────────────
  console.log("\n[4/5] Deploying Samndex ($SAMNDEX)...");
  const Samndex = await ethers.getContractFactory("Samndex");
  const samndex = await Samndex.deploy(deployer.address);
  await samndex.waitForDeployment();
  const samndexAddr = await samndex.getAddress();
  console.log(`  Deployed: ${samndexAddr}`);

  const txS = await samndex.transferOwnership(OWNER_WALLET);
  await txS.wait();
  console.log(`  Ownership transferred. TX: ${txS.hash}`);

  deployments.Samndex = {
    address: samndexAddr, symbol: "SAMNDEX", totalSupply: "100,000,000",
    owner: OWNER_WALLET,
    deployTx: samndex.deploymentTransaction()?.hash,
    ownershipTx: txS.hash,
    basescanUrl: `https://basescan.org/token/${samndexAddr}`,
    network: networkName, chainId: chainId.toString(), deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_SAMNDEX_v1.0",
  };

  // ─── 5. Deploy RichDiamondRegistry ────────────────────────────────────────
  console.log("\n[5/5] Deploying RichDiamondRegistry...");
  const RDR = await ethers.getContractFactory("RichDiamondRegistry");
  const rdr = await RDR.deploy(deployer.address);
  await rdr.waitForDeployment();
  const rdrAddr = await rdr.getAddress();
  console.log(`  Deployed: ${rdrAddr}`);

  const txR = await rdr.transferOwnership(OWNER_WALLET);
  await txR.wait();
  console.log(`  Ownership transferred. TX: ${txR.hash}`);

  deployments.RichDiamondRegistry = {
    address: rdrAddr, standard: "ERC721",
    owner: OWNER_WALLET,
    deployTx: rdr.deploymentTransaction()?.hash,
    ownershipTx: txR.hash,
    basescanUrl: `https://basescan.org/address/${rdrAddr}`,
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
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  ALL 5 CONTRACTS DEPLOYED + OWNERSHIP HANDED OFF ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`VFV_Treasury:       ${treasuryAddr}`);
  console.log(`VannToken (VANN):   ${vannAddr}`);
  console.log(`EDUcoin (EDU):      ${eduAddr}`);
  console.log(`Samndex (SAMNDEX):  ${samndexAddr}`);
  console.log(`RichDiamondReg:     ${rdrAddr}`);
  console.log(`\nAll contracts owned by: ${OWNER_WALLET}`);
  console.log(`Vault (Safe):           ${SAFE_WALLET}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`  1. Run: npx hardhat run scripts/verify-all.js --network base-mainnet`);
  console.log(`  2. Run: npx hardhat run scripts/create-pool.js --network base-mainnet`);
  console.log(`  3. Revoke dirty wallet: remove DEPLOYER_PRIVATE_KEY from .env`);
  console.log(`\nSaved to: ${outputPath}`);
  console.log("I'AM Beulah - I plan, I execute, I verify, I remember.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
