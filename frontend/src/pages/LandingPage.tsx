import { Link } from 'react-router-dom'
import { useWalletContext } from '../context/WalletContext'
import { useEffect, useState } from 'react'
import { EventData } from '../types'
import EventCard from '../components/EventCard'
import {
  Ticket, Shield, Zap, RefreshCw, QrCode,
  ArrowRight, ChevronRight, Wallet, Star,
  Lock, TrendingUp, CheckCircle
} from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Wallet,
    title: 'Connect Your Wallet',
    description: 'Link your MetaMask wallet to authenticate. No passwords or personal data stored — your wallet address is your identity.',
  },
  {
    step: '02',
    icon: Ticket,
    title: 'Buy NFT Tickets',
    description: 'Purchase tickets directly through smart contracts. Each ticket mints as a unique ERC-721 NFT in your wallet.',
  },
  {
    step: '03',
    icon: QrCode,
    title: 'Get Your QR Code',
    description: 'Your NFT ticket generates a cryptographic QR code. Present it at the venue — no paper, no apps, no middlemen.',
  },
  {
    step: '04',
    icon: Shield,
    title: 'Verified Entry',
    description: 'Staff scan your QR and verify ownership on-chain. The smart contract marks your ticket redeemed, preventing re-entry.',
  },
]

const BENEFITS = [
  {
    icon: Shield,
    title: 'Genuine Tickets',
    description: 'Every ticket is a blockchain-verified NFT. Counterfeiting is mathematically impossible.',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Transparent Ownership',
    description: 'Complete transfer history is public and immutable on the blockchain.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Lock,
    title: 'Anti-Scalping',
    description: 'Resale prices are enforced by smart contracts. Organizers set the cap — nobody can exceed it.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: QrCode,
    title: 'Secure Verification',
    description: 'On-chain redemption prevents duplicate entry. The blockchain is the source of truth.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
]

export default function LandingPage() {
  const { isConnected, connect, isConnecting, getAllEvents } = useWalletContext()
  const [featuredEvents, setFeaturedEvents] = useState<EventData[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  useEffect(() => {
    if (isConnected) {
      setLoadingEvents(true)
      getAllEvents()
        .then(evs => {
          const upcoming = evs
            .filter(e => e.active && Number(e.date) > Date.now() / 1000)
            .slice(0, 3)
          setFeaturedEvents(upcoming)
        })
        .finally(() => setLoadingEvents(false))
    }
  }, [isConnected, getAllEvents])

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-4 py-24">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/8 blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Powered by Ethereum Smart Contracts
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-slate-100">Event Tickets</span>
            <br />
            <span className="gradient-text">Reimagined on</span>
            <br />
            <span className="text-slate-100">the Blockchain</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every ticket is an NFT — genuine, transferable, and immune to scalping.
            Smart contracts enforce price caps. Blockchain verifies every entry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <>
                <Link to="/events" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
                  Browse Events <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/organizer" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4">
                  Create Event <ChevronRight className="w-5 h-5" />
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
                <Link to="/events" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4">
                  Browse Events <ArrowRight className="w-5 h-5" />
                </Link>
              </>
            )}
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { label: 'On-Chain', value: '100%' },
              { label: 'No Fakes', value: 'NFT' },
              { label: 'Price Cap', value: 'Enforced' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black gradient-text">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events ───────────────────────────────────────────────── */}
      {isConnected && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="section-title">Featured Events</h2>
                <p className="text-slate-400">Upcoming events on the blockchain</p>
              </div>
              <Link to="/events" className="btn-secondary flex items-center gap-2 text-sm">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card h-80 animate-pulse" />
                ))}
              </div>
            ) : featuredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredEvents.map(ev => (
                  <EventCard key={String(ev.eventId)} event={ev} />
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <Star className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No upcoming events yet. Be the first to create one!</p>
                <Link to="/organizer" className="btn-primary inline-flex items-center gap-2">
                  Create Event <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-navy-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">How It Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Four steps from wallet to event entry — all verified on the blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="glass-card-hover p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-6xl font-black text-white/3 leading-none">
                  {step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">Why Blockchain Ticketing?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Traditional ticketing is broken. Fake tickets, scalpers, and opaque resale markets cost fans billions. We fix this with code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className={`glass-card-hover p-6 border ${bg}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 mb-1">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl" />
          <div className="relative z-10">
            <CheckCircle className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              Ready to Experience Real Ticketing?
            </h2>
            <p className="text-slate-400 mb-8">
              Connect your wallet and enter the future of live events.
              No middlemen. No fake tickets. No scalpers.
            </p>
            {isConnected ? (
              <Link to="/events" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                Browse Events <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
              >
                <Wallet className="w-5 h-5" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet to Start'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
