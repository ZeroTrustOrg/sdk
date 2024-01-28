import { encodeAbiParameters } from "viem";
import type { SimplePasskeyAccountValidator } from "../types";
import { SimplePasskeyAccountSignatureStructAbi } from "../abi/SimplePasskeyAccountAbi";
import { Passkey } from "../utils/passkey-web";

export async function createSimplePasskeyAccountValidator({
    publicKey,
    credentialId
  }:{
    publicKey:ArrayBuffer, 
    credentialId: string
  }): Promise<SimplePasskeyAccountValidator>{

  const publicKeyAsHex = Passkey.buf2hex(publicKey);
  const [pubKeyX,pubKeyY] = await Passkey.getPublicKeyXYCoordinate(publicKey)

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
          id: Passkey.parseBase64url(credentialId),
          type: 'public-key',
        },
      ];
      const {
        authenticatorData,
        clientDataJson,
        challengeLocation,
        responseTypeLocation,
        requireUserVerification,
        r,s } = await Passkey.getPasskeySignatureData(userOperationHash, allowCredentials);
      const passKeySignatureStruct = encodeAbiParameters(
        SimplePasskeyAccountSignatureStructAbi[0].inputs,
        [{challengeLocation:challengeLocation,
          responseTypeLocation:responseTypeLocation,
          r:r,
          s:s,
          requireUserVerification:requireUserVerification,
          authenticatorData:authenticatorData,
          clientDataJSON:clientDataJson
        }] ).substring(2);
        return `0x${passKeySignatureStruct}`;
      // return '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001417ad42d8551e4909ae47832ecb19f3f1dcc6d401de925a1dac9795354aef06b1a04cfe1fe086536a0c5da9034788be926d0a32856881de89ef0be4a3b75deec000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763050000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000867b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a225f4b446e774676464534766a666f3154546561306d676a7662546c50397a2d2d71696977566567326f3977222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a35313733222c2263726f73734f726967696e223a66616c73657d0000000000000000000000000000000000000000000000000000'; //Dummy Signature
    }
  }
}