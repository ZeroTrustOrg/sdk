import{ encodeFunctionData, type Address, type Chain, type Client, type Hex, type Transport, } from "viem"
import { getBytecode, getChainId, } from "viem/actions"
import { getAccountNonce, getUserOperationHash, type UserOperation } from "permissionless"
import type { SimplePasskeyAccount, SimplePasskeyAccountValidator } from "../types"
import { getAccountAddress, getAccountInitCode } from "../utils"
import { ZEROTRUST_ADDRESSES } from "../constants"
import { SimplePasskeyAccountExecuteAbi, SimplePasskeyAccountExecuteBatchAbi } from "../abi/SimplePasskeyAccountAbi"

/**
* Build a simple passkey account ,
* @param client
* @param accountValidator
* @param entryPoint
* @param factoryAddress
* @param index
*/
export async function createSimplePasskeyAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  client: Client<TTransport, TChain>,
  {
      accountValidator,
      entryPoint = ZEROTRUST_ADDRESSES.ENTRY_POINT_ADDRESS,
      factoryAddress = ZEROTRUST_ADDRESSES.FACTORY_ADDRESS,
      index = 0n,
  }: {
      accountValidator: SimplePasskeyAccountValidator
      entryPoint: Address
      factoryAddress?: Address
      index?: bigint
  }
): Promise<SimplePasskeyAccount<TTransport, TChain>> {

  // Helper to generate the init code for the smart account
  const generateInitCode = () =>
      getAccountInitCode({
          pubKeyX: accountValidator.pubKeyX,
          pubKeyY: accountValidator.pubKeyY,
          credentialId: accountValidator.credentialId,
          index,
          factoryAddress
      })

  // Fetch account address and chain id
  const [accountAddress, chainId] = await Promise.all([
      getAccountAddress({
          client,
          factoryAddress,
          entryPoint,
          pubKeyX: accountValidator.pubKeyX,
          pubKeyY: accountValidator.pubKeyY,
          credentialId: accountValidator.credentialId,
          index
      }),
      getChainId(client)
  ])

  if (!accountAddress) throw new Error("Account address not found")

  return {
      ...accountValidator,
      address:accountAddress,
      client: client,
      entryPoint: entryPoint,

      // Get the nonce of the smart account
      async getNonce() {
          return getAccountNonce(client, {
              sender: accountAddress,
              entryPoint: entryPoint
          })
      },

      // Sign a user operation
      async signUserOperation(userOperation:UserOperation) {
        const hash = getUserOperationHash({
          userOperation,
          entryPoint: entryPoint,
          chainId: chainId
        })
        return await accountValidator.signUserOperation(hash,{})
      },

      // Encode the init code
      async getInitCode() {
          const contractCode = await getBytecode(client, {
              address: accountAddress
          })

          if ((contractCode?.length ?? 0) > 2) return "0x"

          return generateInitCode()
      },

      // Encode a call
      async encodeCallData(args: {
        to: `0x${string}`;
        value: bigint;
        data: `0x${string}`;
    } | {
        to: `0x${string}`;
        value: bigint;
        data: `0x${string}`;
    }[]) {
        if (Array.isArray(args)) {
            const argsArray = args as {
                to: Address
                value: bigint
                data: Hex
            }[]
            return encodeFunctionData({
                abi:SimplePasskeyAccountExecuteBatchAbi,
                functionName: "executeBatch",
                args: [
                    argsArray.map((a) => a.to),
                    argsArray.map((a) => a.value),
                    argsArray.map((a) => a.data)
                ]
            })
        }

        const { to, value, data } = args as {
            to: Address
            value: bigint
            data: Hex
        }

        return encodeFunctionData({
            abi: SimplePasskeyAccountExecuteAbi,
            functionName: "execute",
            args: [to, value, data]
        })
      },

      // Get simple dummy signature
      async getDummySignature() {
        return "0x00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001417ad42d8551e4909ae47832ecb19f3f1dcc6d401de925a1dac9795354aef06b1a04cfe1fe086536a0c5da9034788be926d0a32856881de89ef0be4a3b75deec000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763050000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000867b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a225f4b446e774676464534766a666f3154546561306d676a7662546c50397a2d2d71696977566567326f3977222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a35313733222c2263726f73734f726967696e223a66616c73657d0000000000000000000000000000000000000000000000000000"
      },

  }
}