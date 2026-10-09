import erc20 from "./erc20"
import { encodeAbiParameters, Hex, keccak256, stringToBytes, toBytes } from "viem"

export const ObjectId = (m = Math, d = Date, h = 16, s = (s: any) => m.floor(s).toString(h)) => s(d.now() / 1000) + " ".repeat(h).replace(/./g, () => s(m.random() * h))
export function getTimestampInSeconds() {
    return Math.floor(Date.now() / 1000)
}

const CRAY_ORDR_TYPE = "CrayOrder-"
const CRAY_ORDR_TYPE_HASH = keccak256(stringToBytes(CRAY_ORDR_TYPE))

class Order {
    hashOrderOutput = (output: any) => {
        return keccak256(
            encodeAbiParameters(
                [{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }],
                [output.token as Hex, BigInt(output.minAmountOut), output.recipient as Hex, BigInt(output.chainId)]
            )
        )
    }
    hashOrderInput = (input: any) => {
        return keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "address" }, { type: "uint256" }], [BigInt(input.chainId), input.token as Hex, BigInt(input.amount)]))
    }
    hashOrderInputs = (inputs: any) => {
        let packedHashes = new Uint8Array(32 * inputs.length)

        for (let i = 0; i < inputs.length; i++) {
            let inputHash = this.hashOrderInput(inputs[i]) // Call the new function
            packedHashes.set(toBytes(inputHash), i * 32)
        }
        return keccak256(packedHashes)
    }
    hashOrderAction = (action: any) => {
        return keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "bytes" }], [BigInt(action.gasLimit), action.payload as Hex]))
    }
    hashOrder = (order: any) => {
        return keccak256(
            encodeAbiParameters(
                // ['bytes32', 'bytes32', 'bytes32', 'address', 'uint256', 'uint32', 'uint32', 'uint256', 'bytes32', 'bytes32'],
                [
                    { type: "bytes32" },
                    { type: "bytes32" },
                    { type: "bytes32" },
                    { type: "address" },
                    { type: "uint256" },
                    { type: "uint32" },
                    { type: "uint32" },
                    { type: "uint256" },
                    { type: "bytes32" },
                    { type: "bytes32" },
                ],
                [
                    CRAY_ORDR_TYPE_HASH,
                    this.hashOrderInputs(order.inputs),
                    this.hashOrderOutput(order.output),
                    order.sender as Hex,
                    order.nonce,
                    order.initiateDeadline,
                    order.fillDeadline,
                    BigInt(order.settlementExpiry),
                    order.metadata as Hex,
                    this.hashOrderAction(order.action),
                ]
            )
        )
    }
    createOrder = ({ chainId, tokenAddress, owner, orderVerifier, amount = "200000" }: any) => {
        const INITIATE_DEADLINE = 24 * 60 * 60 // seconds
        const FILL_DEADLINE = 24 * 60 * 60 //seconds
        const SETTLEMENT_EXPIRY = 24 * 60 * 60 // seconds
        return {
            inputs: [
                {
                    chainId,
                    token: tokenAddress,
                    amount,
                },
            ],
            output: {
                token: tokenAddress,
                minAmountOut: amount,
                recipient: orderVerifier.address,
                chainId: chainId,
            },
            sender: owner.account.address,
            nonce: BigInt("0x" + ObjectId()),
            initiateDeadline: getTimestampInSeconds() + INITIATE_DEADLINE,
            fillDeadline: getTimestampInSeconds() + FILL_DEADLINE,
            settlementExpiry: getTimestampInSeconds() + SETTLEMENT_EXPIRY,
            metadata: "0x0000000000000000000000000000000000000000000000000000000000000000",
            action: {
                gasLimit: 0,
                payload: "0x",
            },
        }
    }
    prepareAllowancePermitData = async (params: { ownerAddress: any; value: any; orderVerifier: any; usdc: any; provider: any }): Promise<any> => {
        const { ownerAddress, value, orderVerifier, usdc, provider } = params
        const chainId = provider.chain.id
        // VerifierContractAddresses
        const spenderAddress = orderVerifier.address
        const erc20Contract = {
            address: usdc.address,
            abi: erc20,
        } as const

        const allowance = (await provider.readContract({
            address: usdc.address,
            abi: erc20,
            functionName: "allowance",
            args: [ownerAddress, spenderAddress],
        })) as bigint

        if (allowance >= value) {
            return
        }
        const [name, nonce] = await Promise.all([
            provider.readContract({
                ...erc20Contract,
                functionName: "name",
            }),

            provider.readContract({
                ...erc20Contract,
                functionName: "nonces",
                args: [ownerAddress],
            }),
        ])
        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        }

        const domainData = {
            name: name,
            version: "1",
            chainId: chainId,
            verifyingContract: usdc.address,
        }
        const deadline = (getTimestampInSeconds() + 4200).toString()
        const values = {
            owner: ownerAddress,
            spender: spenderAddress,
            value: value, //value: value
            nonce: nonce,
            deadline,
        }
        return { domainData, types, values }
    }
}
const orderUtil = new Order()
export default orderUtil
