import React, { createContext, useContext } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';

type WalletContextType = ReturnType<typeof useWallet> & ReturnType<typeof useContract>;

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const contractHooks = useContract(wallet.signer, wallet.chainId);

  return (
    <WalletContext.Provider value={{ ...wallet, ...contractHooks }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
