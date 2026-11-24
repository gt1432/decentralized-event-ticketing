import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useWalletContext } from '../context/WalletContext'
import { CHAIN_NAMES } from '../types'
import {
  Ticket, Menu, X, Wallet, AlertTriangle, ChevronDown,
  LayoutDashboard, ShoppingBag, QrCode, History, Store
} from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { to: '/events',    label: 'Events',      icon: ShoppingBag },
  { to: '/resale',    label: 'Marketplace', icon: Store },
  { to: '/my-tickets', label: 'My Tickets', icon: Ticket },
  { to: '/organizer', label: 'Organizer',   icon: LayoutDashboard },
  { to: '/verify',    label: 'Verify',      icon: QrCode },
  { to: '/history',   label: 'History',     icon: History },
]

export default function Navbar() {
  const { isConnected, address, shortAddress, chainId, isWrongNetwork, connect, disconnect, switchNetwork, isConnecting } = useWalletContext()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 glass-card border-x-0 border-t-0 rounded-none backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">ChainTickets</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Wallet button */}
          <div className="flex items-center gap-3">
            {isWrongNetwork && isConnected && (
              <button
                onClick={() => switchNetwork(31337)}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-medium hover:bg-yellow-500/30 transition-all"
              >
                <AlertTriangle className="w-3 h-3" />
                Wrong Network
              </button>
            )}

            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(d => !d)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-purple-500/40 hover:bg-white/8 transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0" />
                  <span className="text-sm text-slate-200 font-medium hidden sm:block">{shortAddress}</span>
                  {chainId && (
                    <span className="hidden sm:block text-xs text-slate-500">
                      {CHAIN_NAMES[chainId] ?? `Chain ${chainId}`}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-card border border-white/15 shadow-xl shadow-black/40 p-2 animate-fade-in">
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-xs text-slate-500">Connected as</p>
                      <p className="text-sm text-slate-200 font-mono truncate">{address}</p>
                      <p className="text-xs text-purple-400 mt-0.5">{chainId ? CHAIN_NAMES[chainId] ?? `Chain ${chainId}` : ''}</p>
                    </div>
                    <button
                      onClick={() => { disconnect(); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-white/10 animate-slide-up">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1',
                  isActive
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            {isWrongNetwork && isConnected && (
              <button
                onClick={() => { switchNetwork(31337); setMobileOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-yellow-400 bg-yellow-500/10 mt-1"
              >
                <AlertTriangle className="w-4 h-4" />
                Switch to correct network
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
