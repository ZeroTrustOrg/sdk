# ZeroTrustOrg accounts

This repository allows users to use SimplePasskeyAccount, a smart contract account where Passkey is a signer for submitting ERC4337 UserOperations.

This repository has two peer dependencies: permissionless and viem.

To get started with using SimplePasskeyAccount, follow these steps:

### Install Dependencies

```bash
npm install @zerotrustorg/accounts permissionless viem
```

### Creating a New Passkey

When creating a new Passkey, it is important to save the publicKey and credential ID as they are only extractable at creation time.

```javascript
import { Passkey } from "@zero-trust-org/accounts";

const passkeyCreateCredentialResponse = await Passkey.create({
    appName: 'MyTestDapp',
    displayName: 'TestUser',
    name: 'TestUser',
    yubikeyOnly: false,
});
```

This will return an object of type `PasskeyCreateCredentialResponse` containing the `publicKeyCredential` and `authenticatorAttestationResponse`

```javascript
{
  publicKeyCredential: PublicKeyCredential ;
  authenticatorAttestationResponse: AuthenticatorAttestationResponse;
}
```
You can extract the `credentialId` and `publicKey` of Passkey from this response. 

```javascript
const credentialId = passkeyCreateCredentialResponse.publicKeyCredential.id;
const publicKey = authenticatorAttestationResponse.getPublicKey();
```

### Creating an instance of SimplePasskeyAccount

Once you have the `credentialId` and `publicKey` of the Passkey, you can create an instance of SimplePasskeyAccount using `passkeyToSimplePasskeyAccount`

   ```javascript
    import {  PasskeyToSimplePasskeyAccountParameters, SimplePasskeyAccount, passkeyToSimplePasskeyAccount  } from "@zero-trust-org/accounts";

    const passkeyToSimplePasskeyAccountParameters: PasskeyToSimplePasskeyAccountParameters = {
          credentialId: credentialId,
          publicKey: publicKey,
          entryPoint: entryPointAddress,
          factoryAddress: accountFactoryAddress,
          index: 0,
        };
   
    const simplePasskeyAccount:SimplePasskeyAccount = await passkeyToSimplePasskeyAccount(
      publicClient,
      passkeyToSimplePasskeyAccountParameters,
    );
   ```

The SimplePasskeyAccount instance exposes properties and methods such as signing user operations via Passkey, encoding calldata, getting the account's nonce, and getting the init code of the account.


   ```javascript
   const senderAddress = simplePasskeyAccount.address;
   const nonce = await simplePasskeyAccount.getNonce();
   const initCode = await simplePasskeyAccount.getInitCode();

   const sendEthCalldata = await simplePasskeyAccount.encodeCallData({
      to,
      value,
      data
    });

   const userOperation: UserOperation= {
      callData: sendEthCalldata,
      initCode: nonce === BigInt(0) ? initCode : '0x',
      sender: senderAddress,
      nonce: nonce,
      maxFeePerGas: BigInt(2000000),
      maxPriorityFeePerGas: BigInt(2000000),
      callGasLimit: BigInt(2000000),
      preVerificationGas: BigInt(2000000),
      verificationGasLimit: BigInt(2000000),
      paymasterAndData:'0x',
      signature: await simplePasskeyAccount.getDummySignature()
    };

   const signature = await simplePasskeyAccount.signUserOperation(userOperation);
   ```
Feel free to use these steps to integrate SimplePasskeyAccount into your project.
