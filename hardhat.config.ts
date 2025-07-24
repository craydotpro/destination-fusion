import "@nomiclabs/hardhat-ethers"
// import "@nomiclabs/hardhat-etherscan"; // Ensure etherscan plugin is imported
import "@nomicfoundation/hardhat-toolbox-viem"

import dotenv from "dotenv"
import { HardhatUserConfig } from "hardhat/config"

dotenv.config()

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        arbiSepolia: {
            url: process.env.RPC_URL_ARB_SEPOLIA, // Arbitrum Sepolia RPC URL
            chainId: 421614, // Arbitrum Sepolia chain ID
            accounts: [process.env.PRIVATE_KEY!], // Deployer's private key
        },
        opSepolia: {
            url: process.env.RPC_URL_OP_SEPOLIA, // Optimism Sepolia RPC URL
            chainId: 11155420, // Optimism Sepolia chain ID
            accounts: [process.env.PRIVATE_KEY!], // Deployer's private key
        },
        baseSepolia: {
            url: process.env.RPC_URL_BASE_SEPOLIA, // Base Sepolia RPC URL
            chainId: 84532, // Base Sepolia chain ID
            accounts: [process.env.PRIVATE_KEY!], // Deployer's private key
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY, // Etherscan API key
        customChains: [
            {
                network: "arbiSepolia",
                chainId: 421614,
                urls: {
                    apiURL: "https://api-sepolia.arbiscan.io/api",
                    browserURL: "https://sepolia.arbiscan.io/",
                },
            },
            {
                network: "opSepolia",
                chainId: 11155420,
                urls: {
                    apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
                    browserURL: "https://sepolia-optimism.etherscan.io/",
                },
            },
            {
                network: "baseSepolia",
                chainId: 84532,
                urls: {
                    apiURL: "https://api-sepolia.basescan.org/api",
                    browserURL: "https://sepolia.basescan.org/",
                },
            },
            {
                network: "sepolia",
                chainId: 11155111,
                urls: {
                    apiURL: "https://api-sepolia.etherscan.io/api",
                    browserURL: "https://sepolia.etherscan.io/",
                },
            },
            {
                network: "polygonAmoy",
                chainId: 80002,
                urls: {
                    apiURL: "https://api-amoy.polygonscan.com/api",
                    browserURL: "https://amoy.polygonscan.com/",
                },
            },
        ],
    },
    paths: {
        sources: "./src",


    },
}

export default config
