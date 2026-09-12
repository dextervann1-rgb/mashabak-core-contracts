const { ethers, upgrades, network } = require("hardhat");

const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

async function main() {
  if (!PROXY_ADDRESS || !ethers.isAddress(PROXY_ADDRESS)) {
    throw new Error("A valid PROXY_ADDRESS environment variable is required");
  }

  const Omega8CoreV2 = await ethers.getContractFactory("Omega8CoreV2");

  await upgrades.validateUpgrade(PROXY_ADDRESS, Omega8CoreV2, {
    kind: "transparent",
  });

  console.log(
    `Upgrade validation passed for ${PROXY_ADDRESS} on ${network.name}`
  );
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("Upgrade validation failed:", error);
    process.exitCode = 1;
  });
