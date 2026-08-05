import { useState } from 'react';
import { useWallet } from './useWallet';
import { useToast } from './useToast';
import { submitTransaction, pollTransactionStatus, simulateTransaction } from '../services/contract';
import { TransactionBuilder, rpc } from '@stellar/stellar-sdk';

export const useTransaction = () => {
  const { signTransaction, address } = useWallet();
  const { addToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const execute = async (buildTxFn, successMsg = 'Transaction successful!') => {
    if (!address) {
      addToast('Please connect your wallet first.', 'error');
      return false;
    }

    setIsPending(true);
    addToast('Simulating transaction...', 'info');

    try {
      // 1. Build & Simulate
      const tx = await buildTxFn(address);
      const sim = await simulateTransaction(tx);
      
      // Assemble actual tx with simulated footprint/fees
      const preparedTx = rpc.assembleTransaction(tx, sim).build();

      // 2. Sign — returns { signedTxXdr, signerAddress }
      addToast('Please sign the transaction in your wallet...', 'info');
      const signResult = await signTransaction(preparedTx.toXDR());
      // signResult may be { signedTxXdr } (kit v2) or a raw XDR string (older)
      const signedXdr = signResult?.signedTxXdr ?? signResult;

      // 3. Submit
      addToast('Submitting to network...', 'info');
      const hash = await submitTransaction(signedXdr);

      // 4. Wait for completion
      addToast('Transaction pending, waiting for confirmation...', 'info');
      await pollTransactionStatus(hash);

      const explorerLink = `https://stellar.expert/explorer/testnet/tx/${hash}`;
      
      // We will show a success toast that includes HTML or we just give the string
      addToast(successMsg, 'success');
      console.log('Transaction Success:', explorerLink);
      
      return true;

    } catch (error) {
      console.error(error);
      addToast(error.message || 'Transaction failed.', 'error');
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { execute, isPending };
};
