
import type { Address, Chain, Client, Hex,Transport } from "viem";

export type UserOperation = {
  sender: Address
  nonce: bigint
  initCode: Hex
  callData: Hex
  callGasLimit: bigint
  verificationGasLimit: bigint
  preVerificationGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  paymasterAndData: Hex
  signature: Hex
}

export type SimplePasskeyAccount<TTransport extends Transport,TChain extends Chain | undefined> = {
    address:`0x${string}`
    client: Client<TTransport, TChain>
    entryPoint: Address
    getNonce: () => Promise<bigint>
    getInitCode: () => Promise<Hex>
    encodeCallData: (
        args:
            | {
                  to: Address
                  value: bigint
                  data: Hex
              }
            | {
                  to: Address
                  value: bigint
                  data: Hex
              }[]
    ) => Promise<Hex>
    signUserOperation: (UserOperation: UserOperation) => Promise<Hex>
    getDummySignature(): Promise<Hex>
}

export type PasskeySigner =  {
  pubKeyX:bigint
  pubKeyY:bigint
  publicKeyAsHex:string
  credentialId:string
}


export interface AccountValidator<TValidatorData> {
  signUserOperation(userOperationHash: `0x${string}`, validatorData: TValidatorData): Promise<`0x${string}`>;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type SimplePasskeyAccountValidator = PasskeySigner & AccountValidator<{}>