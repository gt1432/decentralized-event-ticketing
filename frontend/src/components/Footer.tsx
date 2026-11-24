import { Link } from 'react-router-dom'
import { Ticket, Github, Shield, Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">ChainTickets</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Decentralized event ticketing powered by blockchain. Every ticket is an NFT — 
              genuine, verifiable, and protected from scalpers.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                Anti-scalping enforced on-chain
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                Instant NFT minting
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Platform</h4>
            <ul className="space-y-2">
              {[
                { to: '/events', label: 'Browse Events' },
                { to: '/resale', label: 'Resale Market' },
                { to: '/my-tickets', label: 'My Tickets' },
                { to: '/history', label: 'Transaction History' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">For Organizers</h4>
            <ul className="space-y-2">
              {[
                { to: '/organizer', label: 'Create Event' },
                { to: '/organizer', label: 'Dashboard' },
                { to: '/verify', label: 'Verify Tickets' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ChainTickets. Academic project. Not for production financial use.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
            <span className="text-xs text-slate-600">Built with Solidity + React + ethers.js</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
