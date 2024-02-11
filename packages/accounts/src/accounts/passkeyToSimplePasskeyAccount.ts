import type { SimplePasskeyAccount } from "../types";
import { passkeyToPasskeyAccountValidator } from "../validators";
import {
  type ValidatorToSimplePasskeyAccountParameters,
  validatorToSimplePasskeyAccount,
} from "./validatorToSimplePasskeyAccount";
import type { Chain, Client, Transport } from "viem";

export type PasskeyToSimplePasskeyAccountParameters = {
  publicKey: ArrayBuffer;
  credentialId: string;
} & Omit<ValidatorToSimplePasskeyAccountParameters, "accountValidator">;

/**
 * @description Creates an Simple Passkey Account from a passkey.
 *
 * @returns A Simple Passkey Account.
 */
export async function passkeyToSimplePasskeyAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  client: Client<TTransport, TChain, undefined>,
  { publicKey, credentialId, ...rest }: PasskeyToSimplePasskeyAccountParameters,
): Promise<SimplePasskeyAccount<"SimplePasskeyAccount", TTransport, TChain>> {
  const passkeyValidator = await passkeyToPasskeyAccountValidator({ publicKey, credentialId });

  return await validatorToSimplePasskeyAccount(client, {
    accountValidator: passkeyValidator,
    ...rest,
  });
}
