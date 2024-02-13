import { PASSKEY_ERRORS, PasskeyError } from "./constants/errors";

export type PasskeyCreateCredentialResponse = {
  publicKeyCredential: PublicKeyCredential ;
  response:AuthenticatorAttestationResponse;
};

export type PasskeyGetCredentialResponse = {
  publicKeyCredential: PublicKeyCredential ;
  response: AuthenticatorAssertionResponse  ;
};

type PasskeyPublicKeyResponse =  {
  publicKey: ArrayBuffer;
}

export type Verification = {
  isValid: boolean;
  signature: Uint8Array;
  data: Uint8Array;
};

export type WebauthnChallenge = {
  type: string; // usually 'webauthn.get'
  challenge: string;
  origin: string; // usually the origin of the webauthn request
};

export const truncate = (word: string) =>
  word && `...${word.substr(word.length - 10, word.length)}`;

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Passkey{

  static async create({
    appName,
    name,
    displayName,
    yubikeyOnly,
  }: {
    appName: string;
    name: string;
    displayName: string;
    yubikeyOnly?: boolean;
  }): Promise<PasskeyCreateCredentialResponse> {
    if (!navigator.credentials) {
      throw new PasskeyError(PASSKEY_ERRORS.BROWSER_DOES_NOT_SUPPORT_PASSKEY)
    }
    let credential;
    try {
       credential = (await navigator.credentials.create({
        publicKey: Passkey.publicKeyCredentialCreationOptions(
          appName,
          name,
          displayName,
          yubikeyOnly,
        ),
      })) as PublicKeyCredential;
     
    } catch (e) {
      throw new PasskeyError(PASSKEY_ERRORS.USER_REJECTED_CREDENTIAL)
    }

    if(!credential || !credential.response) throw new PasskeyError(PASSKEY_ERRORS.INVALID_CREATE_CREDENTIAL_RESPONSE)
      
    return {
      publicKeyCredential: credential,
      response: credential.response as AuthenticatorAttestationResponse,
    };
  }

  static getPublicKeyFromAttestationResponse(response: AuthenticatorAttestationResponse): PasskeyPublicKeyResponse {
    if (!response) {
      throw new PasskeyError(PASSKEY_ERRORS.INVALID_CREDENTIAL_RESPONSE);
    }
    const publicKey = response.getPublicKey();
    if(!publicKey) throw new PasskeyError(PASSKEY_ERRORS.CREDENTIAL_RESPONSE_HAS_NO_PUBLIC_KEY);
    // const publicKeyAsHex = Passkey.buf2hex(publicKey);
    return { publicKey: publicKey };
  }

  static async get({
    allowCredentials = [],
  }: { allowCredentials?: PublicKeyCredentialDescriptor[] } = {}): Promise<
    PasskeyGetCredentialResponse
  > {
    const randomUUID = crypto.randomUUID();
    const challenge = Passkey.hex2buf(randomUUID);
    let publicKeyCredential:PublicKeyCredential;
    try {
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        allowCredentials,
      };

      publicKeyCredential = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;

    } catch (e) {
      throw new PasskeyError(PASSKEY_ERRORS.UNABLE_TO_RETRIEVE_CREDENTIAL)
    }

    if(!publicKeyCredential || !publicKeyCredential.response) throw new PasskeyError(PASSKEY_ERRORS.INVALID_GET_CREDENTIAL_RESPONSE)
    
    return {
      publicKeyCredential: publicKeyCredential,
      response: publicKeyCredential.response as AuthenticatorAssertionResponse,
    };
  }

  static async importPublicKeyAsCryptoKey(
    publicKey: ArrayBuffer,
  ): Promise<CryptoKey> {
    try {
      const key = await crypto.subtle.importKey(
        "spki",
        publicKey,
        {
          name: "ECDSA",
          namedCurve: "P-256",
          hash: { name: "SHA-256" },
        },
        true,
        ["verify"],
      );
      return key;
    } catch (e) {
      throw new PasskeyError(PASSKEY_ERRORS.PUBLIC_KEY_CANT_BE_PARSED_AS_CRYPTO_KEY)
    }
  }

  static publicKeyCredentialCreationOptions(
    appName: string,
    name: string,
    displayName: string,
    yubikeyOnly?: boolean,
  ): PublicKeyCredentialCreationOptions {
    return {
      challenge: crypto.getRandomValues(new Uint8Array(16)),
      rp: {
        name: appName,
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: name ? name : displayName,
        displayName: displayName,
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7,
        },
      ],
      timeout: 60000,
      attestation: "direct",
      ...(yubikeyOnly && {
        authenticatorSelection: {
          authenticatorAttachment: "cross-platform",
        },
      }),
    };
  }

  static async getPublicKeyXYCoordinate(
		publicKey: ArrayBuffer,
	): Promise<[string, string]> {
    try {
      const publicKeyAsCryptoKey = await Passkey.importPublicKeyAsCryptoKey(publicKey);
      return Passkey.getXYCoordinateFromCryptoPublicKey(publicKeyAsCryptoKey)
    }catch(err){
      console.error("Failed to static key:", err);
      throw new PasskeyError(PASSKEY_ERRORS.PUBLIC_KEY_CANT_BE_PARSED_AS_CRYPTO_KEY);
    }
  }

  static async getXYCoordinateFromCryptoPublicKey(
		publicKey: CryptoKey,
	): Promise<[string, string]> {
    const jwkKey:JsonWebKey = await window.crypto.subtle.exportKey("jwk", publicKey);
    if (jwkKey?.x && jwkKey.y) {
      const pubKeyX = `0x${Passkey.buf2hex(Passkey.parseBase64url(jwkKey.x))}`;
      const pubKeyY = `0x${Passkey.buf2hex(Passkey.parseBase64url(jwkKey.y))}`;
      return [pubKeyX, pubKeyY];
    }
    throw new PasskeyError(PASSKEY_ERRORS.PUBLIC_KEY_CANT_BE_PARSED_AS_CRYPTO_KEY);
	}
	
  static async getPasskeySignatureData(
    challenge: string,
    allowCredentials?: PublicKeyCredentialDescriptor[],
  ): Promise<{
    signature: ArrayBuffer | null;
    authenticatorData: string;
    requireUserVerification: boolean;
    clientDataJson: string;
    challengeLocation: number;
    responseTypeLocation: number;
    r: string;
    s: string;
  }> {
    
    const challengeBuf = Passkey.hex2buf(challenge.substring(2));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuf,
        timeout: 60000,
        allowCredentials,
      };

    const publicKeyCredential = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;

    if (!publicKeyCredential) {
        throw new PasskeyError(PASSKEY_ERRORS.UNABLE_TO_RETRIEVE_CREDENTIAL)
    }
    
    const assertion = publicKeyCredential.response as AuthenticatorAssertionResponse;
    const { signature, clientDataJSON, authenticatorData } = assertion;
    const obtainedClientDataJSON: WebauthnChallenge = JSON.parse(
        new TextDecoder().decode(clientDataJSON),
      );

    const authenticatorDataString = `0x${Passkey.buf2hex(authenticatorData)}`;
    const clientDataJSONString = JSON.stringify(obtainedClientDataJSON);
    const challengeLocation = clientDataJSONString.indexOf('"challenge":');
    const responseTypeLocation = clientDataJSONString.indexOf('"type":"webauthn.get"');
    const requireUserVerification = false;
    const { r, s } = Passkey.normalizeSignature(signature);
    const rValue = `0x${r.toString(16)}`;
    const sValue = `0x${s.toString(16)}`;

    return {
      signature: signature,
      authenticatorData: authenticatorDataString,
      requireUserVerification,
      clientDataJson: clientDataJSONString,
      challengeLocation,
      responseTypeLocation,
      r: rValue,
      s: sValue,
    };
  }

  static async verifySignature({
    publicKey,
    assertion,
  }: {
    publicKey: ArrayBuffer;
    assertion: AuthenticatorAssertionResponse;
  }): Promise<Verification>{
    const { signature, clientDataJSON, authenticatorData } = assertion;
    const authenticatorDataAsUint8Array = new Uint8Array(authenticatorData);
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", clientDataJSON),
    );

    const signedData = new Uint8Array(
      authenticatorDataAsUint8Array.length + clientDataHash.length,
    );
    signedData.set(authenticatorDataAsUint8Array);
    signedData.set(clientDataHash, authenticatorDataAsUint8Array.length);

    const key = await Passkey.importPublicKeyAsCryptoKey(publicKey);
    if(!key) return {isValid: false, signature: new Uint8Array(), data: signedData}
    const usignature = new Uint8Array(signature);
    const rStart = usignature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = usignature.slice(rStart, rEnd);
    const s = usignature.slice(sStart);
    const rawSignature = new Uint8Array([...r, ...s]);

    const verified = await crypto.subtle.verify(
			// eslint-disable-next-line prettier/prettier
			<EcdsaParams>{ name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
      key,
      rawSignature,
      signedData.buffer,
    );

    return { isValid: verified, signature: rawSignature, data: signedData };
  }

  static normalizeSignature( signature: ArrayBuffer): { r: bigint; s: bigint } {
    const usignature = new Uint8Array(signature);
    const rStart = usignature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = BigInt(`0x${Passkey.buf2hex(new Uint8Array(usignature.slice(rStart, rEnd)).buffer.slice(0) as ArrayBuffer)}`);
    let s = BigInt(`0x${Passkey.buf2hex(new Uint8Array(usignature.slice(sStart)).buffer.slice(0) as ArrayBuffer)}`);
    const n = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
    if (s > n / BigInt(2)) {
      s = n - s;
    }
    return { r, s };
  }

  static  buf2hex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  static  hex2buf(hex: string): Uint8Array {
    const bytes = hex.match(/[\da-f]{2}/gi) || [];
    return new Uint8Array(bytes.map((h) => parseInt(h, 16)));
  }

  static  parseBase64url(txt: string): ArrayBuffer {
    const base64Txt = txt.replace(/-/g, "+").replace(/_/g, "/");
    return Passkey.toBuffer(atob(base64Txt));
  }

  static  toBuffer(txt: string): ArrayBuffer {
    return new Uint8Array([...txt].map((c) => c.charCodeAt(0))).buffer.slice(0) as ArrayBuffer;
  }

  static  toBase64url(buffer: ArrayBuffer): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_");
  }

  static  parseBuffer(buffer: ArrayBuffer): string {
    return String.fromCharCode(...new Uint8Array(buffer));
  }
}
