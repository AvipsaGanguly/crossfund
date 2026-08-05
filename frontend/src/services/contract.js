import { rpc, TransactionBuilder, Networks, Account, xdr } from '@stellar/stellar-sdk';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

export const server = new rpc.Server(RPC_URL);

/**
 * Helper to build a basic transaction.
 */
export const buildTransaction = async (sourceAddress, builderFn) => {
  const account = await server.getAccount(sourceAddress);
  const builder = new TransactionBuilder(account, {
    fee: '10000', // Basic fee, for Soroban usually we use simulate to get real fee
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  builderFn(builder);
  
  builder.setTimeout(300);
  return builder.build();
};

/**
 * Simulate the transaction to get the footprint and resources.
 */
export const simulateTransaction = async (tx) => {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation Error: ${sim.error}`);
  }
  return sim;
};

/**
 * Submit transaction to network.
 * Accepts either a Transaction object or a raw XDR string.
 */
export const submitTransaction = async (signedTx) => {
  // server.sendTransaction() accepts a Transaction/FeeBumpTransaction object.
  // If we received a raw XDR string (from the wallet kit), parse it first.
  let txToSubmit = signedTx;
  if (typeof signedTx === 'string') {
    const { Transaction, FeeBumpTransaction, Networks } = await import('@stellar/stellar-sdk');
    try {
      txToSubmit = new Transaction(signedTx, NETWORK_PASSPHRASE);
    } catch {
      txToSubmit = new FeeBumpTransaction(signedTx, NETWORK_PASSPHRASE);
    }
  }

  const response = await server.sendTransaction(txToSubmit);
  if (response.status === 'ERROR') {
    throw new Error(`Submit Failed: ${JSON.stringify(response.errorResult)}`);
  }
  return response.hash;
};

/**
 * Wait for transaction to complete.
 */
export const pollTransactionStatus = async (txHash) => {
  let status = 'PENDING';
  let getTxResponse = null;

  while (status === 'PENDING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    getTxResponse = await server.getTransaction(txHash);
    status = getTxResponse.status;
  }

  if (status === 'FAILED') {
    throw new Error('Transaction failed on-chain.');
  }

  return getTxResponse;
};
