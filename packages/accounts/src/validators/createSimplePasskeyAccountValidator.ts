import { encodeAbiParameters } from "viem";
import type { SimplePasskeyAccountValidator } from "../types";
import { SimplePasskeyAccountSignatureStructAbi } from "../abi/SimplePasskeyAccountAbi";
import { buf2hex, getPasskeySignatureData, getPublicKeyXYCoordinate, hex2buf, importPublicKeyAsCryptoKey, parseBase64url } from "../utils/passkey-web";

export async function createSimplePasskeyAccountValidator({
    publicKey,credentialId}:{
    publicKey:ArrayBuffer, 
    credentialId: string} ): Promise<SimplePasskeyAccountValidator>{

  const publicKeyAsHex = buf2hex(publicKey);
  const publicKeyAsCryptoKey = await importPublicKeyAsCryptoKey(
    hex2buf(publicKeyAsHex)
  );
  const [pubKeyX,pubKeyY] = await getPublicKeyXYCoordinate(publicKeyAsCryptoKey)

  return {
    pubKeyX:BigInt(pubKeyX),
    pubKeyY:BigInt(pubKeyY),
    credentialId:credentialId,
    publicKeyAsHex:publicKeyAsHex,
    async signUserOperation(
      userOperationHash: `0x${string}`,
      _validatorData={}
    ): Promise<`0x${string}`> {
      const allowCredentials: PublicKeyCredentialDescriptor[] = [
        {
          id: parseBase64url(credentialId),
          type: 'public-key',
        },
      ];

      const {
        authenticatorData,
        clientDataJson,
        challengeLocation,
        responseTypeLocation,
        requireUserVerification,
        r,
        s,
        error,
      } = await getPasskeySignatureData(userOperationHash, allowCredentials);

      if (!error) {
        const passKeySignatureStruct = encodeAbiParameters(
          SimplePasskeyAccountSignatureStructAbi[0].inputs,
          [{challengeLocation:challengeLocation,
            responseTypeLocation:responseTypeLocation,
            r:r,
            s:s,
            requireUserVerification:requireUserVerification,
            authenticatorData:authenticatorData,
            clientDataJSON:clientDataJson
          }]
        ).substring(2);
        console.log(`PassKeySignatureStruct: ${passKeySignatureStruct}`)
        return `0x00${passKeySignatureStruct}`;
      }
      if(error){
        throw new PassKeySignatureError(error);
      }

      return '0x03'; //Dummy Signature
    }
  }
}

export class PassKeySignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassKeySignatureError';
  }
}