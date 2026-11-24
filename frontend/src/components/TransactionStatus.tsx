import { TransactionState, EXPLORER_URLS } from '../types'
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  tx: TransactionState
  chainId?: number | null
}

export default function TransactionStatus({ tx, chainId }: Props) {
  if (tx.status === 'idle') return null

  const explorerBase = chainId ? EXPLORER_URLS[chainId] ?? '' : ''

  return (
    <div className={clsx(
      'rounded-xl border p-4 flex items-start gap-3 animate-fade-in',
      tx.status === 'pending'   && 'bg-blue-500/10 border-blue-500/30',
      tx.status === 'confirmed' && 'bg-green-500/10 border-green-500/30',
      tx.status === 'failed'    && 'bg-red-500/10 border-red-500/30',
    )}>
      {tx.status === 'pending' && (
        <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
      )}
      {tx.status === 'confirmed' && (
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
      )}
      {tx.status === 'failed' && (
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}

      <div className="flex-1 min-w-0">
        <p className={clsx(
          'font-medium text-sm',
          tx.status === 'pending'   && 'text-blue-300',
          tx.status === 'confirmed' && 'text-green-300',
          tx.status === 'failed'    && 'text-red-300',
        )}>
          {tx.status === 'pending'   && 'Transaction pending…'}
          {tx.status === 'confirmed' && 'Transaction confirmed!'}
          {tx.status === 'failed'    && 'Transaction failed'}
        </p>

        {tx.hash && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono truncate">
              {tx.hash.slice(0, 20)}...{tx.hash.slice(-6)}
            </span>
            {explorerBase && (
              <a
                href={`${explorerBase}/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 flex-shrink-0"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {tx.error && (
          <p className="mt-1 text-xs text-red-400">{tx.error}</p>
        )}
      </div>
    </div>
  )
}
