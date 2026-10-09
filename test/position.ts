
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseUnits } from "viem";
import { MAX_ALLOWANCE_VALUE, signAdvancePosition } from "./_utils_";

describe("AdvancePosition Execution", function () {
  async function deploy() {
    const provider = await hre.viem.getPublicClient();
    const [owner, user] = await hre.viem.getWalletClients();

    const usdc = await hre.viem.deployContract("MockERC20", ["USDC", "USDC", 6]);
    const usde = await hre.viem.deployContract("MockERC20", ["USDE", "USDE", 18]);

    await usdc.write.mint([user.account.address, parseUnits("1000", 6)]);
    await usde.write.mint([owner.account.address, parseUnits("10000", 18)]); // liquidity for 1inch

    const orderVerifier = await hre.viem.deployContract("CrayOrderVerifier");
    const fusion = await hre.viem.deployContract("FusionDestination", [
      orderVerifier.address,
      owner.account.address,
      owner.account.address,
    ]);
    const oneInch = await hre.viem.deployContract("Mock1Inch", [
      usde.address,
      parseUnits("10000", 18),
      owner.account.address,
    ]);

    await usdc.write.approve([fusion.address, MAX_ALLOWANCE_VALUE]);
    await usde.write.approve([fusion.address, MAX_ALLOWANCE_VALUE]);

    await user.writeContract({
      address: usdc.address,
      abi: usdc.abi,
      functionName: "approve",
      args: [fusion.address, MAX_ALLOWANCE_VALUE],
    });

    return { owner, user, usdc, usde, fusion, oneInch, provider };
  }

  it("should execute an AdvancePosition intent successfully", async function () {
    const { owner, user, usdc, usde, fusion, oneInch, provider } = await loadFixture(deploy);

    const makerAmount = parseUnits("50", 6);
    const deadline = (await provider.getBlock()).timestamp + 3600n;

    const advancePosition = {
      maker: user.account.address,
      makerAsset: usdc.address,
      makerAmount,
      takerAsset: usde.address,
      triggerPrice: parseUnits("1", 18), // just placeholder
      deadline,
      isStopLoss: true,
    };

    const signature = await signAdvancePosition(user, advancePosition);

    const preBalance = await usde.read.balanceOf([user.account.address]);

    await fusion.write.executeAdvancePositions([advancePosition, signature]);

    const postBalance = await usde.read.balanceOf([user.account.address]);

    if (postBalance <= preBalance) {
      throw new Error("AdvancePosition execution failed to transfer funds");
    }
  });
});
