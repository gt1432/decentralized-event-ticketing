import { useEffect, useState, useMemo } from 'react'
import { useWalletContext } from '../context/WalletContext'
import { EventData } from '../types'
import EventCard from '../components/EventCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import { Search, SlidersHorizontal, Calendar, Ticket, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const CATEGORIES = ['All', 'Music', 'Sports', 'Technology', 'Art', 'Comedy', 'Theatre', 'Other']
const STATUS_FILTERS = ['All', 'Upcoming', 'Sold Out', 'Ended']

export default function EventsPage() {
  const { isConnected, getAllEvents } = useWalletContext()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const evs = await getAllEvents()
      setEvents(evs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) load()
  }, [isConnected])

  const filtered = useMemo(() => {
    const now = Date.now() / 1000
    return events.filter(ev => {
      const matchSearch = !search || ev.title.toLowerCase().includes(search.toLowerCase()) || ev.location.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || ev.category === category
      const upcoming = ev.active && Number(ev.date) > now
      const soldOut = ev.ticketsSold >= ev.totalSupply
      const ended = Number(ev.date) < now

      let matchStatus = true
      if (statusFilter === 'Upcoming') matchStatus = upcoming && !soldOut
      if (statusFilter === 'Sold Out') matchStatus = soldOut && upcoming
      if (statusFilter === 'Ended') matchStatus = ended

      return matchSearch && matchCategory && matchStatus
    })
  }, [events, search, category, statusFilter])

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to browse events on the blockchain." />
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black gradient-text mb-2">Events</h1>
        <p className="text-slate-400">Discover upcoming events with NFT-powered tickets</p>
      </div>

      {/* Search + Filter bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search events, venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={clsx('btn-secondary flex items-center gap-2 text-sm py-2 px-4', showFilters && 'border-purple-500/40 text-purple-400')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4 animate-slide-up">
            <div>
              <p className="text-xs text-slate-500 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      category === c
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      statusFilter === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner size="lg" message="Loading events from blockchain..." fullPage />
      ) : filtered.length > 0 ? (
        <>
          <p className="text-sm text-slate-500 mb-4">{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(ev => (
              <EventCard key={String(ev.eventId)} event={ev} />
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card p-16 text-center">
          <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No events found</h3>
          <p className="text-slate-500 mb-6">
            {events.length === 0
              ? 'No events have been created yet. Be the first!'
              : 'No events match your current filters.'}
          </p>
          {events.length === 0 && (
            <a href="/organizer" className="btn-primary inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Create Event
            </a>
          )}
        </div>
      )}
    </div>
  )
}
