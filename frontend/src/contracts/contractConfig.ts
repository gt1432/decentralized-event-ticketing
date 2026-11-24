/**
 * Contract configuration helpers.
 *
 * VITE_CONTRACT_ADDRESS — set in .env after deploying.
 * No private keys, mnemonics, or secrets belong here.
 */

export interface ContractArtifact {
  abi: unknown[];
  networks?: Record<string, { address: string }>;
}

/** Returns the contract address, preferring VITE_CONTRACT_ADDRESS env var. */
export function getContractAddress(
  artifact: ContractArtifact | null,
  chainId: number
): string {
  const envAddr = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
  if (envAddr && envAddr.startsWith('0x') && envAddr.length === 42) return envAddr;

  if (artifact?.networks?.[chainId]) {
    return artifact.networks[chainId].address;
  }
  if (artifact?.networks?.[String(chainId)]) {
    return artifact.networks[String(chainId)].address;
  }
  return '';
}

export const SUPPORTED_CHAIN_IDS: number[] = (() => {
  const raw = import.meta.env.VITE_SUPPORTED_CHAIN_IDS as string | undefined;
  if (raw) return raw.split(',').map(Number);
  return [31337, 11155111];
})();
