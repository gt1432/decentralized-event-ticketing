export interface EventData {
  eventId: bigint;
  organizer: string;
  title: string;
  description: string;
  location: string;
  date: bigint;
  imageURI: string;
  category: string;
  ticketPrice: bigint;
  totalSupply: bigint;
  ticketsSold: bigint;
  maxResaleBps: bigint;
  active: boolean;
}

export interface TicketData {
  tokenId: bigint;
  eventId: bigint;
  originalPrice: bigint;
  purchaseTime: bigint;
  originalBuyer: string;
  redeemed: boolean;
  redemptionTime: bigint;
}

export interface ResaleListing {
  tokenId: bigint;
  seller: string;
  price: bigint;
  active: boolean;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  isWrongNetwork: boolean;
  hasMetaMask: boolean;
}

export interface TransactionState {
  hash: string | null;
  status: 'idle' | 'pending' | 'confirmed' | 'failed';
  error: string | null;
}

export type TicketVerificationStatus = 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'unknown';

export interface QRTicketPayload {
  contractAddress: string;
  tokenId: string;
  eventId: string;
  chainId: number;
  version: string;
}

export interface CreateEventForm {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  imageURI: string;
  category: string;
  ticketPrice: string;
  totalSupply: string;
  maxResalePercent: string;
}

export const SUPPORTED_CHAIN_IDS = [31337, 11155111] as const;
export type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number];

export const CHAIN_NAMES: Record<number, string> = {
  31337: 'Hardhat Local',
  11155111: 'Sepolia Testnet',
};

export const EXPLORER_URLS: Record<number, string> = {
  31337: '',
  11155111: 'https://sepolia.etherscan.io',
};
