import { Wallet } from 'lucide-react'
import { useWalletContext } from '../context/WalletContext'

interface Props {
  message?: string
}

export default function ConnectWalletPrompt({ message = 'Connect your wallet to continue.' }: Props) {
  const { connect, isConnecting, hasMetaMask } = useWalletContext()

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh]">
      <div className="glass-card p-10 max-w-md w-full text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Wallet Required</h2>
        <p className="text-slate-400 mb-8">{message}</p>

        {!hasMetaMask && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            MetaMask is not installed. Please install the MetaMask browser extension to use this application.
          </div>
        )}

        <button
          onClick={connect}
          disabled={isConnecting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>

        {!hasMetaMask && (
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Download MetaMask →
          </a>
        )}
      </div>
    </div>
  )
}
