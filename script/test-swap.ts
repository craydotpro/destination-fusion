import dotenv from 'dotenv';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { getCrayOrder, getCraySignOnOrder, signPaymentData } from '../test/_utils_';
import fusionAbi from './FusionAbi';

dotenv.config()
export const MAX_ALLOWANCE_VALUE = 1000000000000000 * 10 ** 6

async function main() {
  const currentChainId = 8453
  const walletClient = createWalletClient({
      chain: base,
    transport: http(process.env.RPC_URL_BASE)
    })
  const craySigner = privateKeyToAccount(process.env.MAINNET_CRAY_PRIVATE_KEY! as `0x${string}`);
  const solver = privateKeyToAccount(process.env.MAINNET_SOLVER_PRIVATE_KEY! as `0x${string}`);
  const user = privateKeyToAccount(process.env.MAINNET_USER_PRIVATE_KEY! as `0x${string}`);

  // Contracts are deployed using the first signer/account by default
  const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  const usdt = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"

  const orderVerifier = "0x5eDD604a759583e42aa9a2a8799663752405f0F5"
  const crayHorizon = "0x2CBa381707Cd3c88191cda4Be6269f3bfb108279"

  const toAddress = "0x87146d9C3230CF0FCe7ae16a7140522f313bAfCd"
  const amount = 1 * 10 ** 6

  const { typedOrder, orderHash } = getCrayOrder({
    chainId: currentChainId,
    tokenAddress: usdc,
    toToken: usdt,
    owner: user,
    orderVerifier,
    toAddress,
    amount,
  }) as any
  console.log({ typedOrder, orderHash })
  console.log('cray Signer', craySigner.address)
  const { signedOrder } = await signPaymentData(user, typedOrder)
  const res = await Promise.all(
    typedOrder.message.inputs
      .filter((_: any) => _.chainId === currentChainId)
      .map((input: any, index: number) => {
        const payload = {
          order: typedOrder.message,
          solverOutputAmount: typedOrder.message.output.minAmountOut,
          index,
          userSignature: signedOrder,
        }
        return walletClient.writeContract({
          account: solver,
          abi: fusionAbi,
          address: crayHorizon,
          functionName: "createOrder",
          args: [payload],
        })
        // return crayHorizon.write.createOrder([payload])
      })
  )
  console.log('create order res', res)
  const sign = await getCraySignOnOrder(craySigner, solver.address, orderHash)
  const oneInchCalldata = "0x07ed23790000000000000000000000006ea77f83ec8693666866ece250411c974ab962a8000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000fde4c96c8593536e31f229ea8f37b2ada2699bb20000000000000000000000006ea77f83ec8693666866ece250411c974ab962a800000000000000000000000087146d9c3230cf0fce7ae16a7140522f313bafcd00000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000f171b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000015c00000000000000000000000000000000000000000000000000013e00004e00a0744c8c09833589fcd6edb6e08f4c7c32d4f71b54bda0291390cbe4bdd538d6e9b379bff5fe72c3d67a521de500000000000000000000000000000000000000000000000000000000000003e851329ab7730b09ebd9ff2df70f06339bd289a1680a46833589fcd6edb6e08f4c7c32d4f71b54bda02913004475d39ecb000000000000000000000000111111125421ca6dc452d289314280a0f8842a650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000276a400000000000000000000000000000000000000000000000000000000000f171b00000000000000000000000000000000000000000000000000000000688736a600000000651e9670"
  const oneInch = "0x111111125421ca6dc452d289314280a0f8842a65"
  // let fulfill = await crayHorizon.write.fullFillOrder([{ order: typedOrder.message, fullfiller: owner.account.address, outputAmount: typedOrder.message.output.minAmountOut }, sign, oneInchCalldata, oneInch.address])
  const swapParams = {
    makerAsset: usdc,
    swapContract: oneInch,
    swapData: oneInchCalldata
  }
  let fulfill = await walletClient.writeContract({
    account: solver,
    abi: fusionAbi,
    address: crayHorizon,
    functionName: "fullFillOrder",
    args: [{ order: typedOrder.message, fullfiller: solver.address, outputAmount: typedOrder.message.output.minAmountOut }, sign, swapParams]
  })
  console.log({ fulfill })
  // console.log('receiver usde bal after', await usde.read.balanceOf([toAddress]))
}


// Execute the script
main()
  .then(() => {
    console.log('Script executed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error executing script:', error)
    process.exit(1)
  })
