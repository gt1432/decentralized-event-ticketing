import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import { EventData, TicketData, ResaleListing, TransactionState } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import TransactionStatus from '../components/TransactionStatus'
import { format, fromUnixTime } from 'date-fns'
import {
  Store, Ticket, Calendar, MapPin, TrendingUp,
  RefreshCw, ShoppingCart, Tag, AlertCircle
} from 'lucide-react'

interface ResaleItem {
  tokenId: bigint
  listing: ResaleListing
  ticket: TicketData | null
  event: EventData | null
}

export default function ResaleMarketplace() {
  const { isConnected, chainId, getAllEvents, getTicket, getResaleListing, buyResaleTicket, contract } = useWalletContext()
  const [items, setItems] = useState<ResaleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tx, setTx] = useState<TransactionState>({ hash: null, status: 'idle', error: null })
  const [buyingId, setBuyingId] = useState<bigint | null>(null)

  const load = async () => {
    if (!contract) return
    setLoading(true)
    try {
      // Scan all TicketListedForResale events from blockchain
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = contract as any
      const filter = c.filters.TicketListedForResale()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs: any[] = await c.queryFilter(filter, 0, 'latest')
      
      const seen = new Set<string>()
      const results: ResaleItem[] = []

      for (const log of logs) {
        const tokenId = BigInt(log.args[0])
        const key = String(tokenId)
        if (seen.has(key)) continue
        seen.add(key)

        const listing = await getResaleListing(tokenId)
        if (!listing?.active) continue

        const ticket = await getTicket(tokenId)
        const event = ticket ? await (getAllEvents().then(evs => evs.find(e => e.eventId === ticket.eventId) ?? null)) : null

        results.push({ tokenId, listing, ticket, event })
      }

      setItems(results)
    } catch (err) {
      console.error('Error loading resale listings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) load()
  }, [isConnected, contract])

  const handleBuy = async (item: ResaleItem) => {
    setBuyingId(item.tokenId)
    setTx({ hash: null, status: 'idle', error: null })
    const ok = await buyResaleTicket(item.tokenId, item.listing.price, setTx)
    if (ok) {
      setItems(prev => prev.filter(i => i.tokenId !== item.tokenId))
    }
    setBuyingId(null)
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to browse the resale marketplace." />
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black gradient-text mb-2">Resale Marketplace</h1>
          <p className="text-slate-400">Tickets listed for resale with on-chain price caps</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Anti-scalping notice */}
      <div className="glass-card p-4 mb-6 flex items-start gap-3 border border-purple-500/20">
        <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-200">Anti-Scalping Enforced On-Chain</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Resale prices are capped by the smart contract. Each listing has been verified against the event's configured maximum resale price. This cannot be bypassed.
          </p>
        </div>
      </div>

      <TransactionStatus tx={tx} chainId={chainId} />

      {loading ? (
        <LoadingSpinner size="lg" message="Scanning blockchain for resale listings..." fullPage />
      ) : items.length === 0 ? (
        <div className="glass-card p-16 text-center mt-4">
          <Store className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Active Listings</h3>
          <p className="text-slate-500">No tickets are currently listed for resale.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {items.map(item => (
            <ResaleCard
              key={String(item.tokenId)}
              item={item}
              onBuy={() => handleBuy(item)}
              isBuying={buyingId === item.tokenId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ResaleCard({ item, onBuy, isBuying }: { item: ResaleItem; onBuy: () => void; isBuying: boolean }) {
  const { event, ticket, listing, tokenId } = item
  const eventDate = event ? fromUnixTime(Number(event.date)) : null
  const priceDiff = ticket
    ? ((Number(listing.price) - Number(ticket.originalPrice)) / Number(ticket.originalPrice) * 100).toFixed(1)
    : null

  return (
    <div className="glass-card-hover overflow-hidden flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-purple-600 to-blue-600" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Token</p>
              <p className="font-mono font-bold text-sm text-slate-200">#{String(tokenId)}</p>
            </div>
          </div>
          {priceDiff !== null && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${Number(priceDiff) > 0 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
              {Number(priceDiff) > 0 ? '+' : ''}{priceDiff}%
            </span>
          )}
        </div>

        {event ? (
          <div className="flex-1 mb-4">
            <h3 className="font-bold text-slate-100 mb-2 line-clamp-1">{event.title}</h3>
            <div className="space-y-1">
              {eventDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {format(eventDate, 'MMM d, yyyy')}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 mb-4">
            <p className="text-sm text-slate-500">Event #{String(ticket?.eventId)}</p>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs text-slate-500">Resale Price</p>
              <p className="text-xl font-black gradient-text">{ethers.formatEther(listing.price)} ETH</p>
            </div>
            {ticket && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Original</p>
                <p className="text-sm text-slate-400">{ethers.formatEther(ticket.originalPrice)} ETH</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <Tag className="w-3 h-3" />
            Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
          </div>

          <button
            onClick={onBuy}
            disabled={isBuying}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
          >
            <ShoppingCart className="w-4 h-4" />
            {isBuying ? 'Processing...' : `Buy for ${ethers.formatEther(listing.price)} ETH`}
          </button>
        </div>
      </div>
    </div>
  )
}
