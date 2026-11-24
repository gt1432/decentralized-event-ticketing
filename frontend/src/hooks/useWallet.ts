import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WalletState, SUPPORTED_CHAIN_IDS, CHAIN_NAMES } from '../types';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

const INITIAL_STATE: WalletState = {
  address: null,
  chainId: null,
  isConnecting: false,
  isConnected: false,
  isWrongNetwork: false,
  hasMetaMask: false,
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const updateConnectionState = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const chainId = parseInt(chainIdHex, 16);

      if (accounts.length > 0) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        const sign = await prov.getSigner();
        setProvider(prov);
        setSigner(sign);

        const isWrong = !(SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

        setState({
          address: accounts[0],
          chainId,
          isConnecting: false,
          isConnected: true,
          isWrongNetwork: isWrong,
          hasMetaMask: true,
        });

        if (isWrong) {
          toast.error(`Unsupported network. Please switch to ${CHAIN_NAMES[31337] || 'Hardhat Local'} or Sepolia.`, { id: 'wrong-network' });
        }
      } else {
        setProvider(null);
        setSigner(null);
        setState({ ...INITIAL_STATE, hasMetaMask: true });
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  }, []);

  // Check for MetaMask on mount and listen for changes
  useEffect(() => {
    const hasMetaMask = typeof window.ethereum !== 'undefined' && Boolean(window.ethereum?.isMetaMask);
    setState(s => ({ ...s, hasMetaMask }));

    if (hasMetaMask) {
      updateConnectionState();

      const handleAccountsChanged = () => updateConnectionState();
      const handleChainChanged = () => {
        // Reload on chain change per MetaMask recommendation
        window.location.reload();
      };

      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [updateConnectionState]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install MetaMask to continue.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setState(s => ({ ...s, isConnecting: true }));

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await updateConnectionState();
      toast.success('Wallet connected!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection rejected';
      toast.error(msg.includes('rejected') ? 'Connection rejected by user' : msg);
      setState(s => ({ ...s, isConnecting: false }));
    }
  }, [updateConnectionState]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setState({ ...INITIAL_STATE, hasMetaMask: Boolean(window.ethereum) });
    toast.success('Wallet disconnected');
  }, []);

  const switchNetwork = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return;

    const hexChainId = '0x' + targetChainId.toString(16);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (err: unknown) {
      // Chain not in MetaMask — try to add it (Sepolia)
      if ((err as { code?: number }).code === 4902 && targetChainId === 11155111) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
        } catch (addErr) {
          toast.error('Failed to add Sepolia network');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
  }, []);

  const shortAddress = state.address
    ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
    : null;

  return {
    ...state,
    provider,
    signer,
    connect,
    disconnect,
    switchNetwork,
    shortAddress,
  };
}
