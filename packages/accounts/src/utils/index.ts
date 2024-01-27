import { getSenderAddress } from "permissionless"
import { concatHex, type Address, type Chain, type Client, type Transport, encodeFunctionData, fromBytes, stringToBytes, type Hex } from "viem"
import { createAccountAbi } from "../abi/SimplePasskeyAccountAbi"

export * from './passkey-web'

/**
* Get the account initialization code for ZeroTrust smart account with Passkey as signer
* @param pubKeyX
* @param pubKeyY
* @param credentialId
* @param index
* @param factoryAddress
*/
export const getAccountInitCode = async ({
  pubKeyX,
  pubKeyY,
  credentialId,
  index = 0n,
  factoryAddress,
}: {
  pubKeyX:bigint,
  pubKeyY:bigint,
  credentialId:string,
  index: bigint
  factoryAddress: Address
}): Promise<Hex> => {
  if (!pubKeyX) throw new Error("pubKeyX of account not found")
  if (!pubKeyY) throw new Error("pubKeyY of account not found")
  if (!credentialId) throw new Error("credentialId of account not found")

  // Build the account init code
  return concatHex([
      factoryAddress,
      encodeFunctionData({
          abi: createAccountAbi,
          functionName: "createAccount",
          args: [
            pubKeyX,
					  pubKeyY,
					  index,
					  fromBytes(stringToBytes(credentialId),'hex'),
          ]
      }) as Hex
  ])
}

export const getAccountAddress = async< TTransport extends Transport = Transport, TChain extends Chain | undefined = Chain | undefined > ({ client,
    factoryAddress,
    entryPoint,
    pubKeyX,
    pubKeyY,
    credentialId,
    index = 0n
  }: {
    client: Client<TTransport, TChain>
    factoryAddress: Address
    entryPoint: Address
    pubKeyX:bigint,
    pubKeyY:bigint,
    credentialId:string,
    index?: bigint,
  }): Promise<Address> => {
    const initCode = await getAccountInitCode({pubKeyX, pubKeyY, credentialId, index, factoryAddress})
    console.log(`initCode: ${initCode}`)
    console.log(`entryPoint: ${entryPoint}`)
    return getSenderAddress(client, {
        initCode,
        entryPoint
    })
}

