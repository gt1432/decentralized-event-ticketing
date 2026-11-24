import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { EventData } from '../types'
import { Calendar, MapPin, Ticket, Tag } from 'lucide-react'
import { format, fromUnixTime } from 'date-fns'
import clsx from 'clsx'

interface Props {
  event: EventData
  showBuyButton?: boolean
}

function getEventStatus(event: EventData): 'upcoming' | 'sold_out' | 'completed' | 'inactive' {
  if (!event.active) return 'inactive'
  const now = Math.floor(Date.now() / 1000)
  if (Number(event.date) < now) return 'completed'
  if (event.ticketsSold >= event.totalSupply) return 'sold_out'
  return 'upcoming'
}

export default function EventCard({ event, showBuyButton = true }: Props) {
  const status = getEventStatus(event)
  const eventDate = fromUnixTime(Number(event.date))
  const remaining = Number(event.totalSupply) - Number(event.ticketsSold)
  const soldPct = Number(event.ticketsSold) / Number(event.totalSupply) * 100

  const statusBadge = {
    upcoming:  <span className="badge-green">Live</span>,
    sold_out:  <span className="badge-red">Sold Out</span>,
    completed: <span className="badge-gray">Ended</span>,
    inactive:  <span className="badge-yellow">Inactive</span>,
  }[status]

  return (
    <div className="glass-card-hover overflow-hidden group flex flex-col h-full">
      {/* Poster */}
      <div className="relative h-48 bg-gradient-to-br from-purple-900/40 to-blue-900/40 overflow-hidden">
        {event.imageURI && !event.imageURI.startsWith('ipfs://') ? (
          <img
            src={event.imageURI}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Ticket className="w-12 h-12 text-purple-500/50 mx-auto mb-2" />
              <p className="text-xs text-slate-600">{event.category}</p>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {statusBadge}
          <span className="badge-purple">{event.category}</span>
        </div>
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1">
          <p className="text-xs font-bold text-white">{ethers.formatEther(event.ticketPrice)} ETH</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-slate-100 mb-3 line-clamp-2 group-hover:text-purple-300 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span>{format(eventDate, 'MMM d, yyyy · h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Tag className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{remaining} of {Number(event.totalSupply)} tickets left</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{Number(event.ticketsSold)} sold</span>
            <span>{Math.round(soldPct)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                soldPct >= 90 ? 'bg-red-500' : soldPct >= 60 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>

        <div className="mt-auto">
          {showBuyButton && (
            <Link
              to={`/events/${event.eventId}`}
              className={clsx(
                'block text-center py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200',
                status === 'upcoming'
                  ? 'btn-primary'
                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-default'
              )}
              onClick={status !== 'upcoming' ? (e) => e.preventDefault() : undefined}
            >
              {status === 'upcoming' ? 'View & Buy' : status === 'sold_out' ? 'Sold Out' : status === 'completed' ? 'Event Ended' : 'Inactive'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
