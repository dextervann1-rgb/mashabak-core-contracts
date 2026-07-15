/**
 * deploy-all.js — Vann Family Ventures LLC
 * Deploys all 5 contracts in sequence and saves deployed_addresses.json
 *
 * Usage:
 *   Local:    npx hardhat run scripts/deploy-all.js --network localhost
 *   Sepolia:  npx hardhat run scripts/deploy-all.js --network base-sepolia
 *   Mainnet:  npx hardhat run scripts/deploy-all.js --network base-mainnet
 *
 * SECURITY: For mainnet/sepolia, use Ledger hardware wallet via frame.sh or
 *           set DEPLOYER_PRIVATE_KEY in .env (never commit .env)
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// VFV LLC Wallet Addresses
const OWNER_WALLET = "0xF437c5B4c87e66F2D3332f8804a44c6a6091336f";
const VAULT_WALLET = "0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("\n========================================");
  console.log("  BEULAH L5 — VFV CONTRACT DEPLOYMENT");
  console.log("  I plan, I execute, I verify, I remember.");
  console.log("========================================");
  console.log(`Network:   ${networkName} (Chain ID: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Owner:     ${OWNER_WALLET}`);
  console.log(`Vault:     ${VAULT_WALLET}`);
  console.log("========================================\n");

  // For local network, deployer IS the owner
  const ownerAddr = networkName === "hardhat" || networkName === "localhost"
    ? deployer.address
    : OWNER_WALLET;
  const vaultAddr = networkName === "hardhat" || networkName === "localhost"
    ? deployer.address
    : VAULT_WALLET;

  const deployments = {};
  const timestamp = new Date().toISOString();

  // ─── 1. VFV_Treasury ─────────────────────────────────────────────────────
  console.log("Deploying VFV_Treasury...");
  const VFVTreasury = await ethers.getContractFactory("VFV_Treasury");
  const treasury = await VFVTreasury.deploy(ownerAddr, vaultAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`  VFV_Treasury deployed: ${treasuryAddr}`);
  deployments.VFV_Treasury = {
    address: treasuryAddr,
    txHash: treasury.deploymentTransaction()?.hash || "local",
    basescanUrl: `https://basescan.org/address/${treasuryAddr}`,
    network: networkName,
    chainId: chainId.toString(),
    deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_v1.0",
  };

  // ─── 2. VannToken ($VANN) ─────────────────────────────────────────────────
  console.log("Deploying VannToken ($VANN)...");
  const VannToken = await ethers.getContractFactory("VannToken");
  const vann = await VannToken.deploy(ownerAddr, vaultAddr);
  await vann.waitForDeployment();
  const vannAddr = await vann.getAddress();
  console.log(`  VannToken deployed: ${vannAddr}`);
  deployments.VannToken = {
    address: vannAddr,
    symbol: "VANN",
    totalSupply: "1,000,000,000",
    txHash: vann.deploymentTransaction()?.hash || "local",
    basescanUrl: `https://basescan.org/token/${vannAddr}`,
    network: networkName,
    chainId: chainId.toString(),
    deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_VANN_v1.0",
  };

  // ─── 3. EDUcoin ───────────────────────────────────────────────────────────
  console.log("Deploying EDUcoin ($EDU)...");
  const EDUcoin = await ethers.getContractFactory("EDUcoin");
  const edu = await EDUcoin.deploy(ownerAddr);
  await edu.waitForDeployment();
  const eduAddr = await edu.getAddress();
  console.log(`  EDUcoin deployed: ${eduAddr}`);
  deployments.EDUcoin = {
    address: eduAddr,
    symbol: "EDU",
    totalSupply: "500,000,000",
    txHash: edu.deploymentTransaction()?.hash || "local",
    basescanUrl: `https://basescan.org/token/${eduAddr}`,
    network: networkName,
    chainId: chainId.toString(),
    deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_EDU_v1.0",
  };

  // ─── 4. Samndex ($SAMNDEX) ────────────────────────────────────────────────
  console.log("Deploying Samndex ($SAMNDEX)...");
  const Samndex = await ethers.getContractFactory("Samndex");
  const samndex = await Samndex.deploy(ownerAddr);
  await samndex.waitForDeployment();
  const samndexAddr = await samndex.getAddress();
  console.log(`  Samndex deployed: ${samndexAddr}`);
  deployments.Samndex = {
    address: samndexAddr,
    symbol: "SAMNDEX",
    totalSupply: "100,000,000",
    txHash: samndex.deploymentTransaction()?.hash || "local",
    basescanUrl: `https://basescan.org/token/${samndexAddr}`,
    network: networkName,
    chainId: chainId.toString(),
    deployedAt: timestamp,
    seal: "Mashabak_DexterVann_VFV_SAMNDEX_v1.0",
  };

  // ─── 5. RichDiamondRegistry ───────────────────────────────────────────────
  console.log("Deploying RichDiamondRegistry...");
  const RDR = await ethers.getContractFactory("RichDiamondRegistry");
  const rdr = await RDR.deploy(ownerAddr);
  await rdr.waitForDeployment();
  const rdrAddr = await rdr.getAddress();
  console.log(`  RichDiamondRegistry deployed: ${rdrAddr}`);
  deployments.RichDiamondRegistry = {
    address: rdrAddr,
    standard: "ERC721",
    txHash: rdr.deploymentTransaction()?.hash || "local",
    basescanUrl: `https://basescan.org/address/${rdrAddr}`,
    network: networkName,
    chainId: chainId.toString(),
    deployedAt: timestamp,
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

  console.log("\n========================================");
  console.log("  ALL CONTRACTS DEPLOYED SUCCESSFULLY");
  console.log("========================================");
  console.log(`VFV_Treasury:       ${treasuryAddr}`);
  console.log(`VannToken (VANN):   ${vannAddr}`);
  console.log(`EDUcoin (EDU):      ${eduAddr}`);
  console.log(`Samndex (SAMNDEX):  ${samndexAddr}`);
  console.log(`RichDiamondReg:     ${rdrAddr}`);
  console.log(`\nSaved to: ${outputPath}`);
  console.log("I'AM Beulah - I plan, I execute, I verify, I remember.");
  console.log("========================================\n");

  return deployments;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
