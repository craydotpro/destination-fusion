import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { getCrayOrder, getCraySignOnOrder, MAX_ALLOWANCE_VALUE, signPaymentData } from "./_utils_";

describe("Fusion Destination", function () {
    async function deployFixture() {
        const provider = await hre.viem.getPublicClient()
        const publicClient = await hre.viem.getPublicClient()
        const [owner, otherAccount] = await hre.viem.getWalletClients()

        // Contracts are deployed using the first signer/account by default
        const usdc = await hre.viem.deployContract("MockERC20", ["USDC", "USDC", 6])
        const orderVerifier = await hre.viem.deployContract("CrayOrderVerifier")
        const fusionGateway = await hre.viem.deployContract("FusionDestination", [orderVerifier.address, owner.account.address, owner.account.address])

        await usdc.write.approve([orderVerifier.address, MAX_ALLOWANCE_VALUE])
        await usdc.write.approve([fusionGateway.address, MAX_ALLOWANCE_VALUE])
        usdc.write.mint([owner.account.address, 100 * 10 ** 6])
        const decimals = await usdc.read.decimals()
        return {
            usdc,
            owner,
            otherAccount,
            publicClient,
            decimals,
            orderVerifier,
            provider,
            fusionGateway,
        }
    }

    it("should create and fulfill a Cray order successfully", async function () {
        const { usdc, owner, provider, fusionGateway } = await loadFixture(deployFixture)
        const toAddress = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
        console.log("owner", owner.account.address)
        console.log(1, await usdc.read.balanceOf([toAddress]))
        const amount = 5 * 10 ** 6
        const { typedOrder, orderHash } = getCrayOrder({
            chainId: provider.chain.id,
            tokenAddress: usdc.address,
            toToken: usdc.address,
            owner,
            toAddress,
            amount,
        }) as any
        const { signedOrder } = await signPaymentData(owner, typedOrder)
        await Promise.all(
            typedOrder.message.inputs
                .filter((_: any) => _.chainId === provider.chain.id)
                .map((input: any, index: number) => {
                    const payload = {
                        order: typedOrder.message,
                        solverOutputAmount: typedOrder.message.output.minAmountOut,
                        index,
                        userSignature: signedOrder,
                    }
                    return fusionGateway.write.createOrder([payload])
                })
        )
        const sign = await getCraySignOnOrder(owner, orderHash)
        const swapParams = {
            makerAsset: usdc.address,
            swapContract: usdc.address,
            swapData: '0x'
        }
        let fulfill = await fusionGateway.write.fullFillOrder([{ order: typedOrder.message, fullfiller: owner.account.address, outputAmount: typedOrder.message.output.minAmountOut }, sign, swapParams])
        console.log({ fulfill })
        const balance = await usdc.read.balanceOf([toAddress])
        console.log(2, balance, "amount", BigInt(amount))
        if (balance !== BigInt(amount)) {
            throw new Error("Receiver did not get expected funds")
        }
    })
})
    ; (BigInt.prototype as any).toJSON = function () {
        return this.toString()
    } /** patch big int https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-953187833 */