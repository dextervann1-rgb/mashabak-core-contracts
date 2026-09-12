const { ethers, upgrades, run, network } = require("hardhat");

async function main() {
  console.log(`Starting deployment to ${network.name}...`);

  const Omega8Core = await ethers.getContractFactory("Omega8Core");
  const initialSupply = ethers.parseEther("1000000");

  const proxy = await upgrades.deployProxy(Omega8Core, [initialSupply], {
    initializer: "initialize",
    kind: "transparent",
  });

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`Proxy deployed successfully to: ${proxyAddress}`);
  console.log(`Implementation deployed to: ${implementationAddress}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    const deploymentTx = proxy.deploymentTransaction();
    if (deploymentTx) {
      console.log("Waiting for 5 block confirmations...");
      await deploymentTx.wait(5);
    }

    console.log("Verifying implementation on the configured explorer...");
    try {
      await run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log(`Implementation verified successfully: ${implementationAddress}`);
    } catch (error) {
      const message = error?.message?.toLowerCase() || "";
      if (message.includes("already verified") || message.includes("already been verified")) {
        console.log("Implementation is already verified.");
      } else {
        throw error;
      }
    }
  }
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("Deployment script failed:", error);
    process.exitCode = 1;
  });
