import React from 'react'
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import LoadingSpinner from '../components/LoadingSpinner'
import { EXPLORER_URLS } from '../types'
import { format } from 'date-fns'
import { History, ExternalLink, RefreshCw, Ticket, TrendingUp, CheckCircle, ShoppingCart, Plus } from 'lucide-react'
import clsx from 'clsx'

interface TxEvent {
  type: 'EventCreated' | 'TicketPurchased' | 'TicketResold' | 'TicketRedeemed' | 'TicketListedForResale'
  txHash: string
  blockNumber: number
  timestamp?: number
  args: Record<string, string>
}

const EVENT_STYLES: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  EventCreated:          { icon: <Plus className="w-4 h-4" />,         color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Event Created' },
  TicketPurchased:       { icon: <ShoppingCart className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',      label: 'Ticket Purchased' },
  TicketResold:          { icon: <TrendingUp className="w-4 h-4" />,   color: 'text-green-400 bg-green-500/10 border-green-500/20',   label: 'Ticket Resold' },
  TicketRedeemed:        { icon: <CheckCircle className="w-4 h-4" />,  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', label: 'Ticket Redeemed' },
  TicketListedForResale: { icon: <Ticket className="w-4 h-4" />,       color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Listed for Resale' },
}

export default function TransactionHistory() {
  const { isConnected, address, chainId, contract, provider } = useWalletContext()
  const [events, setEvents] = useState<TxEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = async () => {
    if (!contract || !address || !provider) return
    setLoading(true)

    try {
      const eventTypes = [
        'EventCreated',
        'TicketPurchased',
        'TicketResold',
        'TicketRedeemed',
        'TicketListedForResale',
      ]

      const allEvents: TxEvent[] = []

      for (const eventName of eventTypes) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = contract as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const logs: any[] = await c.queryFilter(c.filters[eventName](), 0, 'latest')

          for (const log of logs) {
            const parsed = contract.interface.parseLog({
              topics: Array.isArray(log.topics) ? log.topics : [],
              data: log.data || '0x',
            })
            if (!parsed) continue

            // Filter to user-relevant events if not showing all
            const args: Record<string, string> = {}
            parsed.fragment.inputs.forEach((inp, i) => {
              const val = parsed.args[i]
              args[inp.name] = typeof val === 'bigint'
                ? (inp.type === 'uint256' && inp.name.toLowerCase().includes('price') ? ethers.formatEther(val) + ' ETH' : String(val))
                : String(val)
            })

            allEvents.push({
              type: eventName as TxEvent['type'],
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              args,
            })
          }
        } catch (err) {
          // Skip if event type not found in ABI
        }
      }

      // Sort by block number descending
      allEvents.sort((a, b) => b.blockNumber - a.blockNumber)

      // Fetch timestamps for first 20
      for (let i = 0; i < Math.min(20, allEvents.length); i++) {
        try {
          const block = await provider.getBlock(allEvents[i].blockNumber)
          if (block) allEvents[i].timestamp = block.timestamp
        } catch { /* non-critical */ }
      }

      setEvents(allEvents)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && contract) load()
  }, [isConnected, contract, showAll])

  const explorerBase = chainId ? EXPLORER_URLS[chainId] ?? '' : ''

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view transaction history." />
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black gradient-text mb-2">Transaction History</h1>
          <p className="text-slate-400">On-chain event log from smart contract</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAll(a => !a)}
            className={clsx('btn-secondary text-sm', showAll && 'border-purple-500/40 text-purple-400')}
          >
            {showAll ? 'My Transactions' : 'All Transactions'}
          </button>
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" message="Reading blockchain event logs..." fullPage />
      ) : events.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No transactions found yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev, i) => {
            const style = EVENT_STYLES[ev.type] ?? EVENT_STYLES.TicketPurchased
            return (
              <div key={`${ev.txHash}-${i}`} className="glass-card-hover p-4 flex items-start gap-4">
                <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0', style.color)}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="font-semibold text-sm text-slate-200">{style.label}</span>
                    {ev.timestamp && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {format(new Date(ev.timestamp * 1000), 'MMM d, yyyy HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {Object.entries(ev.args).map(([k, v]) => (
                      <span key={k} className="text-xs text-slate-500">
                        <span className="text-slate-600">{k}:</span> {v.length > 20 ? v.slice(0, 10) + '...' : v}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-600 font-mono">
                      Block #{ev.blockNumber} · {ev.txHash.slice(0, 12)}...
                    </span>
                    {explorerBase && (
                      <a
                        href={`${explorerBase}/tx/${ev.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View on Etherscan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
