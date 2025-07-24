import dotenv from 'dotenv'
import fs from 'fs-extra'
import { ethers, network, run } from 'hardhat'
import path from 'path'

dotenv.config()

const networkName = network.name // Dynamically fetch network name
const networkFilePath = path.join(
  __dirname,
  `../deployments/${networkName}.json`
)
const deployments = loadDeploymentData(networkFilePath)

function loadDeploymentData(networkFilePath: string): Record<string, string> {
  if (!fs.existsSync(networkFilePath)) {
    throw new Error(`Deployment file not found: ${networkFilePath}`)
  }
  return JSON.parse(fs.readFileSync(networkFilePath, 'utf8'))
}

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  // Address of the signer
  const signerAddress = '0x34f7A9E8Fa1f1994B89878C186f6aCA820153733'
  const CRAY_VERIFIER_KEY = 'CrayOrderVerifier'
  const verifierAddress = deployments[CRAY_VERIFIER_KEY]

  // Deploy CrayGateway
  console.log('Deploying FusionDestination...')
  const FusionDestination = await ethers.getContractFactory('FusionDestination')
  const gateway = await FusionDestination.deploy(
    verifierAddress,
    signerAddress,
    ethers.constants.AddressZero
  )
  await gateway.deployed()
  console.log('FusionDestination deployed at:', gateway.address)



  // Verify Contracts
  
  await verifyContract(gateway.address, [
    verifierAddress,
    signerAddress,
    ethers.constants.AddressZero
  ])
  
  // Save deployed contract addresses
  saveDeployment({    
    FusionDestination: gateway.address,
  
  })

  console.log('Deployment completed successfully!')
}

async function verifyContract(address: string, constructorArguments: any[]) {
  console.log(`Verifying contract at ${address}...`)
  try {
    await run('verify:verify', {
      address,
      constructorArguments
    })
    console.log(`Contract verified: ${address}`)
  } catch (error: any) {
    if (error.message.includes('Already Verified')) {
      console.log(`Contract at ${address} is already verified.`)
    } else {
      console.error(`Failed to verify contract at ${address}:`, error.message)
    }
  }
}

function saveDeployment(contracts: Record<string, string>) {
  let deployments = {}
  if (fs.existsSync(networkFilePath)) {
    deployments = JSON.parse(fs.readFileSync(networkFilePath, 'utf-8'))
  }
  const newDeployments = { ...deployments, ...contracts }
  fs.writeFileSync(networkFilePath, JSON.stringify(newDeployments, null, 2))
  console.log('Deployment addresses saved to:', networkFilePath)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
