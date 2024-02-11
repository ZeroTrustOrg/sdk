import { type Address, BaseError, type Chain, type Client, type Hex, type LocalAccount, type Transport } from "viem";

export type UserOperation = {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
};

export type SimplePasskeyAccount<
  Name extends string = string,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> = LocalAccount<Name> & {
  address: Address;
  client: Client<TTransport, TChain, undefined>;
  entryPoint: Address;
  getNonce: () => Promise<bigint>;
  getInitCode: () => Promise<Hex>;
  encodeCallData: (
    args:
      | {
          to: Address;
          value: bigint;
          data: Hex;
        }
      | {
          to: Address;
          value: bigint;
          data: Hex;
        }[],
  ) => Promise<Hex>;
  signUserOperation: (UserOperation: UserOperation) => Promise<Hex>;
  getDummySignature(): Promise<Hex>;
};

export type PasskeySigner<TSource extends string = string, TAddress extends Address = Address> = Omit<
  LocalAccount<TSource, TAddress>,
  "address"
> & {
  pubKeyX: bigint;
  pubKeyY: bigint;
  publicKey: Hex;
  credentialId: string;
};

export interface AccountValidator<TValidatorData> {
  signUserOperationHash(userOperationHash: `0x${string}`, validatorData: TValidatorData): Promise<`0x${string}`>;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type SimplePasskeyAccountValidator = PasskeySigner & AccountValidator<{}>;

export class SignTypeDataNotSupportedBySimplePasskeyAccount extends BaseError {
  override name = "SignTransactionNotSupportedBySmartAccount";
  constructor({ docsPath }: { docsPath?: string } = {}) {
    super(
      [
        "A passkey account cannot sign or send transaction, it can only sign message or userOperation.",
        "Please send user operation instead.",
      ].join("\n"),
      {
        docsPath,
        docsSlug: "account",
      },
    );
  }
}

export class SignTransactionNotSupportedBySimplePasskeyAccount extends BaseError {
  override name = "SignTransactionNotSupportedBySmartAccount";
  constructor({ docsPath }: { docsPath?: string } = {}) {
    super(
      [
        "A passkey account cannot sign or send transaction, it can only sign message or userOperation.",
        "Please send user operation instead.",
      ].join("\n"),
      {
        docsPath,
        docsSlug: "account",
      },
    );
  }
}
