/**
 * The executor abi, used to execute transactions on the SimplePasskeyAccount
 */
export const SimplePasskeyAccountExecuteBatchAbi = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "dest",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "value",
        type: "uint256[]",
      },
      {
        internalType: "bytes[]",
        name: "func",
        type: "bytes[]",
      },
    ],
    name: "executeBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const SimplePasskeyAccountExecuteAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "dest",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "func",
        type: "bytes",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * The account creation ABI for SimplePasskeyAccount (from the SimplePasskeyAccountFactory)
 */

export const createAccountAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "pubKeyX",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "pubKeyY",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "salt",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "credentialId",
        type: "bytes",
      },
    ],
    name: "createAccount",
    outputs: [
      {
        internalType: "contract ZeroTrustAccount",
        name: "ret",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const SimplePasskeyAccountSignatureStructAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "challengeLocation",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "responseTypeLocation",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "r",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "s",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "requireUserVerification",
            type: "bool",
          },
          {
            internalType: "bytes",
            name: "authenticatorData",
            type: "bytes",
          },
          {
            internalType: "string",
            name: "clientDataJSON",
            type: "string",
          },
        ],
        internalType: "struct IPasskeyAccount.PasskeySigData",
        name: "sig",
        type: "tuple",
      },
    ],
    name: "passkeySignatureStruct",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
