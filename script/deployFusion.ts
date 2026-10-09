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
const CRAY_VERIFIER_KEY = 'CrayOrderVerifier'
async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  // Address of the signer
  const signerAddress = '0x34f7A9E8Fa1f1994B89878C186f6aCA820153733'
  const deployments = loadDeploymentData(networkFilePath)
  const verifierAddress = deployments[CRAY_VERIFIER_KEY]
  // Deploy CrayOrderVerifier
  // console.log('Deploying CrayOrderVerifier...')
  // const CrayOrderVerifier = await ethers.getContractFactory('CrayOrderVerifier')
  // const verifier = await CrayOrderVerifier.deploy()
  // await verifier.deployed()
  // console.log('CrayOrderVerifier deployed at:', verifier.address)

  // Deploy FusionDestination
  console.log('Deploying FusionDestination...')
  const CrayGateway = await ethers.getContractFactory('FusionDestination')
  const gateway = await CrayGateway.deploy(
    verifierAddress,
    signerAddress,
    ethers.constants.AddressZero
  )
  await gateway.deployed()
  console.log('FusionDestination deployed at:', gateway.address)

  // // Deploy Executer
  // console.log('Deploying Executer...')
  // const Executer = await ethers.getContractFactory('Executer')
  // const executer = await Executer.deploy(gateway.address)
  // await executer.deployed()
  // console.log('Executer deployed at:', executer.address)

  // // Set Executer in CrayGateway
  // console.log('Setting Executer in CrayGateway...')
  // const tx = await gateway.setExecuter(executer.address)
  // await tx.wait()
  // console.log('Executer set successfully.')

  // Verify Contracts
  // await verifyContract(verifier.address, [])
  // wait for 10 seconds to avoid rate limits
  console.log('Waiting for 10 seconds before verifying contracts...')
  await new Promise((resolve) => setTimeout(resolve, 10000))
  console.log('Verifying FusionDestination contract...')
  await verifyContract(gateway.address, [
    verifierAddress,
    signerAddress,
    ethers.constants.AddressZero
  ])
  // await verifyContract(executer.address, [gateway.address])

  // Save deployed contract addresses
  saveDeployment({
    // CrayOrderVerifier: verifier.address,
    FusionDestination: gateway.address,
    // Executer: executer.address
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

function loadDeploymentData(networkFilePath: string): Record<string, string> {
  if (!fs.existsSync(networkFilePath)) {
    throw new Error(`Deployment file not found: ${networkFilePath} `)
  }
  return JSON.parse(fs.readFileSync(networkFilePath, 'utf8'))
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
