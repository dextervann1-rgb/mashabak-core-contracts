const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Omega8Core Upgrade Pipeline", function () {
  let omega8Proxy;
  let proxyAddress;
  let owner;
  let user;
  let initialSupply;
  let maxTxAmount;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Omega8Core = await ethers.getContractFactory("Omega8Core");
    initialSupply = ethers.parseEther("1000000");
    maxTxAmount = ethers.parseEther("500000");

    omega8Proxy = await upgrades.deployProxy(Omega8Core, [initialSupply], {
      initializer: "initialize",
      kind: "transparent",
    });

    await omega8Proxy.waitForDeployment();
    proxyAddress = await omega8Proxy.getAddress();
  });

  async function getV2Factory() {
    return ethers.getContractFactory("Omega8CoreV2");
  }

  async function upgradeToV2() {
    const Omega8CoreV2 = await getV2Factory();

    const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, Omega8CoreV2, {
      kind: "transparent",
      call: {
        fn: "initializeV2",
        args: [maxTxAmount],
      },
    });

    await upgradedProxy.waitForDeployment();
    return upgradedProxy;
  }

  it("passes OpenZeppelin storage-layout validation", async function () {
    const Omega8CoreV2 = await getV2Factory();
    await upgrades.validateUpgrade(proxyAddress, Omega8CoreV2, {
      kind: "transparent",
    });
  });

  it("preserves state and proxy address after upgrading to V2", async function () {
    const upgradedProxy = await upgradeToV2();

    expect(await upgradedProxy.getAddress()).to.equal(proxyAddress);
    expect(await upgradedProxy.initialSupply()).to.equal(initialSupply);
    expect(await upgradedProxy.owner()).to.equal(owner.address);
    expect(await upgradedProxy.maxTxAmount()).to.equal(maxTxAmount);
  });

  it("allows the owner to update V2 state", async function () {
    const upgradedProxy = await upgradeToV2();
    const newMaxTxAmount = ethers.parseEther("100000");

    await expect(upgradedProxy.setMaxTxAmount(newMaxTxAmount))
      .to.emit(upgradedProxy, "MaxTxAmountUpdated")
      .withArgs(newMaxTxAmount);

    await upgradedProxy.setBlacklistStatus(user.address, true);
    expect(await upgradedProxy.isBlacklisted(user.address)).to.equal(true);
  });

  it("prevents non-owners from calling V2 privileged functions", async function () {
    const upgradedProxy = await upgradeToV2();

    await expect(
      upgradedProxy.connect(user).setMaxTxAmount(ethers.parseEther("100"))
    ).to.be.reverted;

    await expect(
      upgradedProxy.connect(user).setBlacklistStatus(user.address, true)
    ).to.be.reverted;
  });

  it("cannot run the V2 reinitializer more than once", async function () {
    const upgradedProxy = await upgradeToV2();
    await expect(upgradedProxy.initializeV2(ethers.parseEther("1"))).to.be.reverted;
  });
});
