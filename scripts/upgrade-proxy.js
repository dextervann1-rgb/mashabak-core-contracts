const { ethers, upgrades, network } = require("hardhat");

const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

async function main() {
  if (!PROXY_ADDRESS || !ethers.isAddress(PROXY_ADDRESS)) {
    throw new Error("A valid PROXY_ADDRESS environment variable is required");
  }

  console.log(`Upgrading proxy at ${PROXY_ADDRESS} on ${network.name}...`);

  const Omega8CoreV2 = await ethers.getContractFactory("Omega8CoreV2");
  const maxTxAmount = ethers.parseEther("500000");

  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, Omega8CoreV2, {
    kind: "transparent",
    call: {
      fn: "initializeV2",
      args: [maxTxAmount],
    },
  });

  await upgraded.waitForDeployment();

  const newImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);

  console.log("Proxy upgraded successfully!");
  console.log(`Proxy address: ${PROXY_ADDRESS}`);
  console.log(`New implementation address: ${newImplementationAddress}`);
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("Upgrade failed:", error);
    process.exitCode = 1;
  });
