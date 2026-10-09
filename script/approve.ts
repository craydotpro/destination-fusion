import dotenv from 'dotenv'
import fs from 'fs-extra'
import { ethers, network } from 'hardhat'
import path from 'path'

dotenv.config()
const CRAY_GATEWAY_KEY = 'FusionDestination'

function getNetworkFilePath(name: string): string {
  return path.join(__dirname, `../deployments/${name}.json`)
}

const fetchTokens = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/tokens')
    return response.json().then((data) => data.result)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return []
  }
}

async function main() {
  const allTokens = await fetchTokens()
  const currentChainId = network.config.chainId
  if (!currentChainId) {
    throw new Error('Network chain ID not found in Hardhat config.')
  }
  const networkName = network.name
  const deployments = loadDeploymentData(getNetworkFilePath(networkName))
  const gatewayAddress = deployments[CRAY_GATEWAY_KEY]
  const tokens = allTokens.filter((token) => token.chainId === currentChainId)
  const solver = new ethers.Wallet(process.env.MAINNET_SOLVER_PRIVATE_KEY!, ethers.provider)
  for (const token of tokens) {
    // Get the contract instance
    console.log(`Approving token: ${token.tokenAddress}...`)
    const erc20Contract = new ethers.Contract(
      token.tokenAddress,
      [
        {
          inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'value', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      solver
    )

    const tx = await erc20Contract.functions.approve(
      gatewayAddress,
      ethers.constants.MaxUint256
    )
    console.log(`Approved Tx: ${tx.hash} `)
    await tx.wait()
    console.log(`Connection confirmed on - chain.`)
  }
}

function loadDeploymentData(networkFilePath: string): Record<string, string> {
  if (!fs.existsSync(networkFilePath)) {
    throw new Error(`Deployment file not found: ${networkFilePath} `)
  }
  return JSON.parse(fs.readFileSync(networkFilePath, 'utf8'))
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
