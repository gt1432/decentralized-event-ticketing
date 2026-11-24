import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import { TicketData, EventData } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import { format, fromUnixTime } from 'date-fns'
import { Ticket, QrCode, RefreshCw, ArrowRight, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface TicketItem {
  tokenId: bigint
  ticket: TicketData
  event: EventData | null
}

export default function MyTicketsPage() {
  const { isConnected, address, getMyTickets } = useWalletContext()
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!address) return
    setLoading(true)
    try {
      const items = await getMyTickets(address)
      setTickets(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) load()
  }, [isConnected, address])

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view your NFT tickets." />
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black gradient-text mb-2">My Tickets</h1>
          <p className="text-slate-400">Your NFT event tickets on the blockchain</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" message="Loading your tickets from blockchain..." fullPage />
      ) : tickets.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Tickets Yet</h3>
          <p className="text-slate-500 mb-6">You haven't purchased any tickets. Browse upcoming events to get started.</p>
          <Link to="/events" className="btn-primary inline-flex items-center gap-2">
            Browse Events <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tickets.map(({ tokenId, ticket, event }) => (
            <TicketCard key={String(tokenId)} tokenId={tokenId} ticket={ticket} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ tokenId, ticket, event }: { tokenId: bigint; ticket: TicketData; event: EventData | null }) {
  const isRedeemed = ticket.redeemed
  const eventDate = event ? fromUnixTime(Number(event.date)) : null

  return (
    <Link to={`/my-tickets/${tokenId}`} className="block">
      <div className={clsx(
        'glass-card-hover overflow-hidden h-full flex flex-col',
        isRedeemed && 'opacity-70'
      )}>
        {/* Top gradient band */}
        <div className="h-2 bg-gradient-to-r from-purple-600 to-blue-600" />

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Token</p>
                <p className="font-mono text-sm font-bold text-slate-200">#{String(tokenId)}</p>
              </div>
            </div>
            {isRedeemed ? (
              <span className="badge-gray flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Used
              </span>
            ) : (
              <span className="badge-green flex items-center gap-1">
                <Clock className="w-3 h-3" /> Valid
              </span>
            )}
          </div>

          {/* Event info */}
          {event ? (
            <div className="flex-1">
              <h3 className="font-bold text-slate-100 mb-3 line-clamp-2">{event.title}</h3>
              <div className="space-y-1.5">
                {eventDate && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {format(eventDate, 'MMM d, yyyy')}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 flex-1">Event #{String(ticket.eventId)}</p>
          )}

          {/* Price + QR hint */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="font-semibold text-slate-200">{ethers.formatEther(ticket.originalPrice)} ETH</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-400">
              <QrCode className="w-4 h-4" />
              View QR
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
