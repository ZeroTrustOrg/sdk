import { PASSKEY_ERRORS } from "./constants/errors.js";

export type PasskeyCredentialResponse = {
  data: PublicKeyCredential | null;
  response:
    | AuthenticatorAttestationResponse
    | AuthenticatorAssertionResponse
    | null;
  error: string | null;
};

interface PasskeyStringResponse {
  data: string | null;
  error: string | null;
}

export type PasskeyRawIdResponse = PasskeyStringResponse;
export type PasskeyPublicKeyAsHexResponse = PasskeyStringResponse;

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


  export function getPublicKeyFromAttestationResponse({
    response,
  }: {
    response: AuthenticatorAttestationResponse | null;
  }): PasskeyStringResponse {
    if (!response) {
      return { data: null, error: PASSKEY_ERRORS.INVALID_CREDENTIAL_RESPONSE };
    }
    try {
      const publicKey = response.getPublicKey();
      if(!publicKey) return {  data: null,  error: PASSKEY_ERRORS.CREDENTIAL_RESPONSE_HAS_NO_PUBLIC_KEY, };
      const publicKeyAsHex = buf2hex(publicKey);
      return { data: publicKeyAsHex, error: null };
    } catch (e) {
      return {
        data: null,
        error: PASSKEY_ERRORS.CREDENTIAL_RESPONSE_HAS_NO_PUBLIC_KEY,
      };
    }
  }

  export async function get({
    allowCredentials = [],
  }: { allowCredentials?: PublicKeyCredentialDescriptor[] } = {}): Promise<
    PasskeyCredentialResponse
  > {
    const randomUUID = crypto.randomUUID();
    const challenge = hex2buf(randomUUID);
    try {
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        allowCredentials,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;

      return {
        data: assertion,
        response: assertion.response as
          | AuthenticatorAttestationResponse
          | AuthenticatorAssertionResponse,
        error: null,
      };
    } catch (e) {
      return {
        data: null,
        response: null,
        error: PASSKEY_ERRORS.UNABLE_TO_RETRIEVE_CREDENTIAL,
      };
    }
  }

  export async function create({
    appName,
    name,
    displayName,
    yubikeyOnly,
  }: {
    appName: string;
    name: string;
    displayName: string;
    yubikeyOnly?: boolean;
  }): Promise<PasskeyCredentialResponse> {
    try {
      if (!navigator.credentials) {
        return {
          data: null,
          response: null,
          error: PASSKEY_ERRORS.BROWSER_DOES_NOT_SUPPORT_PASSKEY,
        };
      }

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions(
          appName,
          name,
          displayName,
          yubikeyOnly,
        ),
      })) as PublicKeyCredential;

      return {
        data: credential,
        response: credential.response as AuthenticatorAttestationResponse,
        error: null,
      };
    } catch (e) {
      return {
        data: null,
        response: null,
        error: PASSKEY_ERRORS.USER_REJECTED_CREDENTIAL,
      };
    }
  }

  export async function importPublicKeyAsCryptoKey(
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
      throw new Error('Error importing publicKey as CryptoKey')
    }
  }

  export function publicKeyCredentialCreationOptions(
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

  export async function getPublicKeyXYCoordinate(
		publicKey: CryptoKey,
	): Promise<[string, string]> {
		let jwkKey:JsonWebKey;
		try {
			jwkKey = await window.crypto.subtle.exportKey("jwk", publicKey);
			if (jwkKey?.x && jwkKey.y) {
				const pubKeyX = `0x${buf2hex(parseBase64url(jwkKey.x))}`;
				const pubKeyY = `0x${buf2hex(parseBase64url(jwkKey.y))}`;
				return [pubKeyX, pubKeyY];
			}
			throw new Error(PASSKEY_ERRORS.PUBLIC_KEY_CANT_BE_PARSED_AS_CRYPTO_KEY);
		} catch (err) {
			console.error("Failed to export key:", err);
			throw new Error(PASSKEY_ERRORS.PUBLIC_KEY_CANT_BE_PARSED_AS_CRYPTO_KEY);
		}
	}
	

  export async function getPasskeySignatureData(
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
    error: PASSKEY_ERRORS | null;
  }> {
    let assertion: PublicKeyCredential | null;
    try {
      const challengeBuf = hex2buf(challenge.substring(2));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          challenge: challengeBuf,
          timeout: 60000,
          allowCredentials,
        };

      assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;
    } catch (e) {
      return {
        signature: null,
        authenticatorData: "",
        requireUserVerification: false,
        clientDataJson: "",
        challengeLocation: 0,
        responseTypeLocation: 0,
        r: "",
        s: "",
        error: PASSKEY_ERRORS.UNABLE_TO_RETRIEVE_CREDENTIAL,
      };
    }
    if (!assertion) {
      return {
        signature: null,
        authenticatorData: "",
        requireUserVerification: false,
        clientDataJson: "",
        challengeLocation: 0,
        responseTypeLocation: 0,
        r: "",
        s: "",
        error: PASSKEY_ERRORS.UNABLE_TO_RETRIEVE_CREDENTIAL,
      };
    }

    const assertation = assertion.response as AuthenticatorAssertionResponse;
    const { signature, clientDataJSON, authenticatorData } = assertation;
    const obtainedClientDataJSON: WebauthnChallenge = JSON.parse(
      new TextDecoder().decode(clientDataJSON),
    );

    const authenticatorDataString = `0x${buf2hex(authenticatorData)}`;
    const clientDataJSONString = JSON.stringify(obtainedClientDataJSON);
    const challengeLocation = 23;
    const responseTypeLocation = 1;
    const requireUserVerification = false;
    const { r, s } = normalizeSignature(signature);
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
      error: null,
    };
  }

  export async function verifySignature({
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

    const key = await importPublicKeyAsCryptoKey(publicKey);
    if(!key) return {isValid: false, signature: new Uint8Array(), data: signedData}
    const usignature = new Uint8Array(signature);
    const rStart = usignature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = usignature.slice(rStart, rEnd);
    const s = usignature.slice(sStart);
    const rawSignature = new Uint8Array([...r, ...s]);

    const verified = await crypto.subtle.verify(
			<EcdsaParams>{ name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
      key,
      rawSignature,
      signedData.buffer,
    );

    return { isValid: verified, signature: rawSignature, data: signedData };
  };

  function normalizeSignature(
    signature: ArrayBuffer,
  ): { r: bigint; s: bigint } {
    const usignature = new Uint8Array(signature);
    const rStart = usignature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = BigInt(`0x${buf2hex(new Uint8Array(usignature.slice(rStart, rEnd)).buffer.slice(0) as ArrayBuffer)}`);
    let s = BigInt(`0x${buf2hex(new Uint8Array(usignature.slice(sStart)).buffer.slice(0) as ArrayBuffer)}`);

    const n = BigInt(
      "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551",
    );
    if (s > n / BigInt(2)) {
      s = n - s;
    }
    return { r, s };
  }

  export function buf2hex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  export function hex2buf(hex: string): Uint8Array {
    const bytes = hex.match(/[\da-f]{2}/gi) || [];
    return new Uint8Array(bytes.map((h) => parseInt(h, 16)));
  }

  export function parseBase64url(txt: string): ArrayBuffer {
    const base64Txt = txt.replace(/-/g, "+").replace(/_/g, "/");
    return toBuffer(atob(base64Txt));
  }

  export function toBuffer(txt: string): ArrayBuffer {
    return new Uint8Array([...txt].map((c) => c.charCodeAt(0))).buffer.slice(0) as ArrayBuffer;
  }

  export function toBase64url(buffer: ArrayBuffer): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_");
  }

  export function parseBuffer(buffer: ArrayBuffer): string {
    return String.fromCharCode(...new Uint8Array(buffer));
  }
