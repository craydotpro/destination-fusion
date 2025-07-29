import dotenv from 'dotenv';
import { createWalletClient, erc20Abi, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { signPosition } from '../test/_utils_';
import fusionAbi from './FusionAbi';

dotenv.config()
export const MAX_ALLOWANCE_VALUE = 1000000000000000 * 10 ** 6

async function main() {
  const currentChainId = 8453
  const walletClient = createWalletClient({
    chain: base,
    transport: http(process.env.RPC_URL_BASE)
  })
  // const craySigner = privateKeyToAccount(process.env.MAINNET_CRAY_PRIVATE_KEY! as `0x${string}`);
  const solver = privateKeyToAccount(process.env.MAINNET_SOLVER_PRIVATE_KEY! as `0x${string}`);
  const user = privateKeyToAccount(process.env.MAINNET_USER_PRIVATE_KEY! as `0x${string}`);

  // Contracts are deployed using the first signer/account by default
  const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  const usdt = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
  const weth = "0x4200000000000000000000000000000000000006"
  const orderVerifier = "0x5eDD604a759583e42aa9a2a8799663752405f0F5"
  const crayHorizon = "0xf750496670aA07c30368879b4B58939edAbAb3AE"

  const toAddress = "0x87146d9C3230CF0FCe7ae16a7140522f313bAfCd"

  const amount = parseUnits("0.0039", 18); 


  const position = {
    maker: user.address,
    makerAsset: weth,
    makerAmount: amount,
    takerAsset: usdc,
    triggerPrice: 1 * 10 ** 6,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    isStopLoss: true,
  }
  const tx =await walletClient.writeContract({
    account: user,
    address: weth,
    functionName: "approve",
    abi: erc20Abi,
    args: [crayHorizon, amount]
  })
  console.log("Approve WETH transaction:", tx)
  // wait for 10 seconds to ensure the transaction is mined
  await new Promise(resolve => setTimeout(resolve, 10000));
  const sign = await signPosition(user, position);
  console.log("Signature:", sign)
  const oneInchCalldata = "0x07ed23790000000000000000000000006ea77f83ec8693666866ece250411c974ab962a80000000000000000000000004200000000000000000000000000000000000006000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000006ea77f83ec8693666866ece250411c974ab962a800000000000000000000000087146d9c3230cf0fce7ae16a7140522f313bafcd000000000000000000000000000000000000000000000000000ddb07829fc0000000000000000000000000000000000000000000000000000000000000e39dde0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000cf0000000000000000000000000000000000000000000000000000b100004e00a0744c8c09420000000000000000000000000000000000000690cbe4bdd538d6e9b379bff5fe72c3d67a521de500000000000000000000000000000000000000000000000000000aa41e58080002a00000000000000000000000000000000000000000000000000000000000e39ddeee63c1e58172ab388e2e2f6facef59e3c3fa2c4e29011c2d384200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a650000000000000000000000000000000000651e9670"
  const oneInch = "0x111111125421ca6dc452d289314280a0f8842a65"
  const posParams = {
    ...position,
    swapContract: oneInch,
    swapData: oneInchCalldata
  }

  let res = await walletClient.writeContract({
    account: solver,
    abi: fusionAbi,
    address: crayHorizon,
    functionName: "executeAdvancePositions",
    args: [posParams, sign]
  })
  console.log({ res })
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
