import { encodeAbiParameters, Hex, keccak256, stringToBytes, toBytes } from "viem"
export const ObjectId = (m = Math, d = Date, h = 16, s = (s: any) => m.floor(s).toString(h)) => s(d.now() / 1000) + " ".repeat(h).replace(/./g, () => s(m.random() * h))

export const MAX_ALLOWANCE_VALUE = 1000000000000000 * 10 ** 6

export function getTimestampInSeconds() {
    return Math.floor(Date.now() / 1000)
}

export const signPaymentData = async (owner: any, crayOrder: any, allowanceData?: any[]) => {
    // todo: check if spender is SCA then sign separately for all chains
    // const orders = Array.isArray(orderHash) ? orderHash : [orderHash];
    // const signedOrder = await Promise.all(orders.map(async (hash) => {
    const signedOrder = await owner.signTypedData(crayOrder)
    // }));
    const signedApprovalData =
        allowanceData &&
        (await Promise.all(
            allowanceData.map(async (data) => {
                const signature = await owner.signTypedData({
                    types: data.types,
                    domain: data.domainData,
                    message: data.values,
                    primaryType: "Permit",
                })
                return {
                    r: signature.slice(0, 66),
                    s: "0x" + signature.slice(66, 130),
                    v: "0x" + signature.slice(130, 132),
                    chainId: data.domainData.chainId,
                    verifyingContract: data.domainData.verifyingContract,
                    walletAddress: owner.account.address,
                    value: data.values.value,
                    deadline: data.values.deadline,
                }
            })
        ))
    return { signedOrder, signedApprovalData }
}
/////
const CRAY_ORDR_TYPE_HASH = keccak256(
    stringToBytes(
        "CrayOrder(Input[] inputs,Output output,address sender,uint256 nonce,uint32 initiateDeadline,uint32 fillDeadline,uint256 settlementExpiry,bytes32 metadata,DestinationAction action)DestinationAction(bytes payload,uint256 gasLimit)Input(uint256 chainId,address token,uint256 amount)Output(uint256 chainId,address token,uint256 minAmountOut,address recipient)"
    )
)
const INPUT_TYPEHASH = keccak256(stringToBytes("Input(uint256 chainId,address token,uint256 amount)"))
const OUTPUT_TYPEHASH = keccak256(stringToBytes("Output(uint256 chainId,address token,uint256 minAmountOut,address recipient)"))
const DESTINATION_ACTION_TYPEHASH = keccak256(stringToBytes("DestinationAction(bytes payload,uint256 gasLimit)"))

const hashOrderInput = (input: any) => {
    return keccak256(
        encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }], [INPUT_TYPEHASH, BigInt(input.chainId), input.token as Hex, BigInt(input.amount)])
    )
}

export const hashOrderInputs = (inputs: any) => {
    let packedHashes = new Uint8Array(32 * inputs.length)
    for (let i = 0; i < inputs.length; i++) {
        let inputHash = hashOrderInput(inputs[i]) // Call the new function
        packedHashes.set(toBytes(inputHash), i * 32)
    }
    return keccak256(packedHashes)
}

export const hashOrderOutput = (output: any) => {
    return keccak256(
        encodeAbiParameters(
            [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }, { type: "address" }],
            [OUTPUT_TYPEHASH, BigInt(output.chainId), output.token as Hex, BigInt(output.minAmountOut), output.recipient as Hex]
        )
    )
}

export const hashOrderAction = (action: any) => {
    return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }], [DESTINATION_ACTION_TYPEHASH, keccak256(action.payload) as Hex, BigInt(action.gasLimit)]))
}

export const hashOrder = (order: any) => {
    return keccak256(
        encodeAbiParameters(
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
                hashOrderInputs(order.inputs),
                hashOrderOutput(order.output),
                order.sender as Hex,
                order.nonce,
                order.initiateDeadline,
                order.fillDeadline,
                BigInt(order.settlementExpiry),
                order.metadata as Hex,
                hashOrderAction(order.action),
            ]
        )
    )
}
const types = {
    Output: [
        { name: "chainId", type: "uint256" },
        { name: "token", type: "address" },
        { name: "minAmountOut", type: "uint256" },
        { name: "recipient", type: "address" },
    ],
    Input: [
        { name: "chainId", type: "uint256" },
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
    DestinationAction: [
        { name: "payload", type: "bytes" },
        { name: "gasLimit", type: "uint256" },
    ],
    CrayOrder: [
        { name: "inputs", type: "Input[]" },
        { name: "output", type: "Output" },
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initiateDeadline", type: "uint32" },
        { name: "fillDeadline", type: "uint32" },
        { name: "settlementExpiry", type: "uint256" },
        { name: "metadata", type: "bytes32" },
        { name: "action", type: "DestinationAction" },
    ],
}
export const getCrayOrder = ({ chainId, tokenAddress, toToken, owner, toAddress, amount }: any) => {
    const INITIATE_DEADLINE = 24 * 60 * 60 // seconds
    const FILL_DEADLINE = 24 * 60 * 60 //seconds
    const SETTLEMENT_EXPIRY = 24 * 60 * 60 // seconds
    const domain = {
        name: "Cray",
        version: "1",
    }
    const crayOrder = {
        inputs: [
            {
                chainId,
                token: tokenAddress,
                amount,
            },
        ],
        output: {
            token: toToken,
            minAmountOut: amount,
            recipient: toAddress,
            chainId,
        },
        sender: owner.account.address,
        nonce: BigInt("0x" + ObjectId()),
        initiateDeadline: getTimestampInSeconds() + INITIATE_DEADLINE,
        fillDeadline: getTimestampInSeconds() + FILL_DEADLINE,
        settlementExpiry: getTimestampInSeconds() + SETTLEMENT_EXPIRY,
        metadata: "0x0000000000000000000000000000000000000000000000000000000000000000",
        action: {
            payload: "0x",
            gasLimit: 0,
        },
    }
    const typedOrder = {
        domain,
        types,
        primaryType: "CrayOrder",
        message: crayOrder,
    }
    const orderHash = hashOrder(crayOrder)
    return { orderHash, typedOrder }
}

export const approveAllowance = (
    provider: any,
    owner: any,
    orderVerifier: any,
    usdc: any,
    payload: {
        chainId: number
        v: number
        r: string
        s: string
        value: number
        deadline: string
    }[]
) => {
    const walletAddress = owner.account.address
    return Promise.all(
        payload.map(async ({ v, r, s, value, deadline }) => {
            const hash = await usdc.write.permit([walletAddress, orderVerifier.address, value, deadline, v, r, s])
            await provider.waitForTransactionReceipt({ hash })
        })
    )
}

export function getCraySignOnOrder(wallet: any, orderHash: any) {
    const solverAddress = wallet.account?.address!
    const message = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [orderHash, solverAddress]))
    return wallet.signMessage({ message: { raw: message as Hex } })
}

export const signPosition = (account: any,position: any) => { 
    const domain = {
        name: "AdvancePosition",
        version: "1",
    }
    const types = {
        AdvancePosition: [
            { name: "maker", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "makerAmount", type: "uint256" },
            { name: "takerAsset", type: "address" },
            { name: "triggerPrice", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "isStopLoss", type: "bool" },
        ],
    };
    console.log('msg', position)
    return account.signTypedData({
        domain,
        types,
        primaryType: "AdvancePosition",
        message: position,
    });
}
