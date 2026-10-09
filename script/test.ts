import dotenv from 'dotenv';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { getCrayOrder, getCraySignOnOrder, signPaymentData } from '../test/_utils_';
dotenv.config()
export const MAX_ALLOWANCE_VALUE = 1000000000000000 * 10 ** 6

import { privateKeyToAccount } from 'viem/accounts';
const usdcabi = [
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
]
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
          abi: abi,
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
  // // let fulfill = await crayHorizon.write.fullFillOrder([{ order: typedOrder.message, fullfiller: owner.account.address, outputAmount: typedOrder.message.output.minAmountOut }, sign, oneInchCalldata, oneInch.address])
  const swapParams = {
    makerAsset: usdc,
    swapContract: oneInch,
    swapData: oneInchCalldata
  }
  let fulfill = await walletClient.writeContract({
    account: solver,
    abi: abi,
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


const abi = [
  {
    "inputs": [
      {
        "internalType": "contract CrayOrderVerifier",
        "name": "_orderVerifier",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_craySigner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_executer",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidContractSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSigner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinAmountNotMet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnAuthorized",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      }
    ],
    "name": "ActionExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      }
    ],
    "name": "ActionFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "orderInfo",
        "type": "bytes"
      }
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      }
    ],
    "name": "OrderFullFilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      }
    ],
    "name": "OrderSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "name": "connectors",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "craySigner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Input[]",
                "name": "inputs",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "minAmountOut",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct Output",
                "name": "output",
                "type": "tuple"
              },
              {
                "internalType": "address",
                "name": "sender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "nonce",
                "type": "uint256"
              },
              {
                "internalType": "uint32",
                "name": "initiateDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint32",
                "name": "fillDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint256",
                "name": "settlementExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "metadata",
                "type": "bytes32"
              },
              {
                "components": [
                  {
                    "internalType": "bytes",
                    "name": "payload",
                    "type": "bytes"
                  },
                  {
                    "internalType": "uint256",
                    "name": "gasLimit",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct DestinationAction",
                "name": "action",
                "type": "tuple"
              }
            ],
            "internalType": "struct CrayOrder",
            "name": "order",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "solverOutputAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "index",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "userSignature",
            "type": "bytes"
          }
        ],
        "internalType": "struct InitiateArgs",
        "name": "args_",
        "type": "tuple"
      }
    ],
    "name": "createOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executer",
    "outputs": [
      {
        "internalType": "contract Executer",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Input[]",
                "name": "inputs",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "minAmountOut",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct Output",
                "name": "output",
                "type": "tuple"
              },
              {
                "internalType": "address",
                "name": "sender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "nonce",
                "type": "uint256"
              },
              {
                "internalType": "uint32",
                "name": "initiateDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint32",
                "name": "fillDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint256",
                "name": "settlementExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "metadata",
                "type": "bytes32"
              },
              {
                "components": [
                  {
                    "internalType": "bytes",
                    "name": "payload",
                    "type": "bytes"
                  },
                  {
                    "internalType": "uint256",
                    "name": "gasLimit",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct DestinationAction",
                "name": "action",
                "type": "tuple"
              }
            ],
            "internalType": "struct CrayOrder",
            "name": "order",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "fullfiller",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "outputAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct FullFillCrayOrderInput",
        "name": "input_",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "craySignature",
        "type": "bytes"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "makerAsset",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapContract",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "swapData",
            "type": "bytes"
          }
        ],
        "internalType": "struct SwapParams",
        "name": "swapParams",
        "type": "tuple"
      }
    ],
    "name": "fullFillOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Input[]",
                "name": "inputs",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "chainId",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "minAmountOut",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct Output",
                "name": "output",
                "type": "tuple"
              },
              {
                "internalType": "address",
                "name": "sender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "nonce",
                "type": "uint256"
              },
              {
                "internalType": "uint32",
                "name": "initiateDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint32",
                "name": "fillDeadline",
                "type": "uint32"
              },
              {
                "internalType": "uint256",
                "name": "settlementExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "metadata",
                "type": "bytes32"
              },
              {
                "components": [
                  {
                    "internalType": "bytes",
                    "name": "payload",
                    "type": "bytes"
                  },
                  {
                    "internalType": "uint256",
                    "name": "gasLimit",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct DestinationAction",
                "name": "action",
                "type": "tuple"
              }
            ],
            "internalType": "struct CrayOrder",
            "name": "order",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "fullfiller",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "outputAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct FullFillCrayOrderInput",
        "name": "input_",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "craySignature",
        "type": "bytes"
      }
    ],
    "name": "fullFillOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "fullfilledOrders",
    "outputs": [
      {
        "internalType": "address",
        "name": "fullFiller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "fullFillmentTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "getFullFilledOrderChainIds",
    "outputs": [
      {
        "internalType": "uint32[]",
        "name": "",
        "type": "uint32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "getOrderStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "orders",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isCompleted",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "settler",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "settledAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "index",
        "type": "uint8"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "chainId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "internalType": "struct Input",
        "name": "input",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "siblingChainSlug_",
        "type": "uint32"
      },
      {
        "internalType": "bytes",
        "name": "payload_",
        "type": "bytes"
      }
    ],
    "name": "receiveInbound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "rescueTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "chainId",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "connectorAddress",
        "type": "address"
      }
    ],
    "name": "setConnector",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "executer_",
        "type": "address"
      }
    ],
    "name": "setExecuter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "gasLimits",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      }
    ],
    "name": "settleOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "crayId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "fulfiller",
        "type": "address"
      }
    ],
    "name": "submitProof",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verifier",
    "outputs": [
      {
        "internalType": "contract CrayOrderVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]