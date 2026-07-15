/**
 * verify-all.js — Vann Family Ventures LLC
 * Verifies all deployed contracts on Basescan after live deployment.
 *
 * Usage (after deploying to testnet/mainnet):
 *   npx hardhat run scripts/verify-all.js --network base-sepolia
 *   npx hardhat run scripts/verify-all.js --network base-mainnet
 *
 * Requires: BASESCAN_API_KEY in .env
 */

const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const OWNER_WALLET = "0xF437c5B4c87e66F2D3332f8804a44c6a6091336f";
const VAULT_WALLET = "0x380d3B3f68bBBC49B42Cdb0389A65457FD406f0c";

async function verifyContract(name, address, constructorArgs) {
  console.log(`\nVerifying ${name} at ${address}...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`  ${name}: VERIFIED on Basescan`);
    return { verified: true, basescanUrl: `https://basescan.org/address/${address}#code` };
  } catch (err) {
    if (err.message.includes("Already Verified")) {
      console.log(`  ${name}: Already verified`);
      return { verified: true, basescanUrl: `https://basescan.org/address/${address}#code` };
    }
    console.error(`  ${name}: Verification failed — ${err.message}`);
    return { verified: false, error: err.message };
  }
}

async function main() {
  const networkName = network.name;
  const addressFile = path.join(__dirname, "..", "contracts", "deployed_addresses.json");

  if (!fs.existsSync(addressFile)) {
    throw new Error("deployed_addresses.json not found. Run deploy-all.js first.");
  }

  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  const net = addresses[networkName];
  if (!net) {
    throw new Error(`No deployments found for network: ${networkName}`);
  }

  console.log("\n========================================");
  console.log("  BEULAH L5 — BASESCAN VERIFICATION");
  console.log(`  Network: ${networkName}`);
  console.log("========================================\n");

  const results = {};

  if (net.VFV_Treasury?.address) {
    results.VFV_Treasury = await verifyContract("VFV_Treasury", net.VFV_Treasury.address,
      [OWNER_WALLET, VAULT_WALLET]);
  }
  if (net.VannToken?.address) {
    results.VannToken = await verifyContract("VannToken", net.VannToken.address,
      [OWNER_WALLET, VAULT_WALLET]);
  }
  if (net.EDUcoin?.address) {
    results.EDUcoin = await verifyContract("EDUcoin", net.EDUcoin.address,
      [OWNER_WALLET]);
  }
  if (net.Samndex?.address) {
    results.Samndex = await verifyContract("Samndex", net.Samndex.address,
      [OWNER_WALLET]);
  }
  if (net.RichDiamondRegistry?.address) {
    results.RichDiamondRegistry = await verifyContract("RichDiamondRegistry", net.RichDiamondRegistry.address,
      [OWNER_WALLET]);
  }

  // Update deployed_addresses.json with verification results
  for (const [name, result] of Object.entries(results)) {
    if (addresses[networkName][name]) {
      addresses[networkName][name].verified = result.verified;
      addresses[networkName][name].verifiedAt = new Date().toISOString();
      if (result.basescanUrl) addresses[networkName][name].basescanVerifiedUrl = result.basescanUrl;
    }
  }
  fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));

  console.log("\n========================================");
  console.log("  VERIFICATION COMPLETE");
  console.log("========================================");
  for (const [name, result] of Object.entries(results)) {
    console.log(`  ${name}: ${result.verified ? "VERIFIED" : "FAILED"}`);
  }
  console.log("I'AM Beulah - I plan, I execute, I verify, I remember.");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
