import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import { EventData, TransactionState } from '../types'
import { EXPLORER_URLS } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import TransactionStatus from '../components/TransactionStatus'
import { format, fromUnixTime } from 'date-fns'
import {
  Calendar, MapPin, Ticket, Tag, ArrowLeft,
  Users, TrendingUp, AlertCircle, ExternalLink, Clock
} from 'lucide-react'
import clsx from 'clsx'

export default function EventDetailPage() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const { isConnected, address, chainId, getEvent, buyTicket, contractAddress } = useWalletContext()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [tx, setTx] = useState<TransactionState>({ hash: null, status: 'idle', error: null })
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null)

  useEffect(() => {
    if (!isConnected || !eventIdParam) return
    setLoading(true)
    getEvent(BigInt(eventIdParam))
      .then(ev => setEvent(ev))
      .finally(() => setLoading(false))
  }, [isConnected, eventIdParam, getEvent])

  const handleBuy = async () => {
    if (!event) return
    setBuying(true)
    const tokenId = await buyTicket(event.eventId, event.ticketPrice, setTx)
    if (tokenId !== null) setMintedTokenId(tokenId)
    setBuying(false)
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view event details and purchase tickets." />
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading event..." fullPage />

  if (!event) {
    return (
      <div className="page-container text-center py-20">
        <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-300 mb-2">Event Not Found</h2>
        <Link to="/events" className="btn-secondary inline-flex items-center gap-2 mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const isUpcoming = event.active && Number(event.date) > now
  const isSoldOut = event.ticketsSold >= event.totalSupply
  const remaining = Number(event.totalSupply) - Number(event.ticketsSold)
  const soldPct = Number(event.ticketsSold) / Number(event.totalSupply) * 100
  const explorerBase = chainId ? EXPLORER_URLS[chainId] ?? '' : ''
  const resaleCapPercent = (Number(event.maxResaleBps) / 100).toFixed(0)
  const maxResalePrice = ethers.formatEther(
    event.ticketPrice + (event.ticketPrice * event.maxResaleBps / 10000n)
  )

  return (
    <div className="page-container">
      <Link to="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Poster */}
          <div className="relative h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/40 to-blue-900/40">
            {event.imageURI && !event.imageURI.startsWith('ipfs://') ? (
              <img
                src={event.imageURI}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-20 h-20 text-purple-500/30" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              {isUpcoming && !isSoldOut && <span className="badge-green">On Sale</span>}
              {isSoldOut && <span className="badge-red">Sold Out</span>}
              {!isUpcoming && !isSoldOut && <span className="badge-gray">Ended</span>}
              <span className="badge-purple">{event.category}</span>
            </div>
          </div>

          {/* Title + details */}
          <div className="glass-card p-6">
            <h1 className="text-3xl font-black text-slate-100 mb-4">{event.title}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date & Time</p>
                  <p className="font-medium text-sm">{format(fromUnixTime(Number(event.date)), 'MMMM d, yyyy · h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium text-sm">{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Capacity</p>
                  <p className="font-medium text-sm">{remaining} / {Number(event.totalSupply)} remaining</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Resale Cap</p>
                  <p className="font-medium text-sm">
                    {Number(event.maxResaleBps) === 0
                      ? 'No resale allowed'
                      : `+${resaleCapPercent}% (max ${maxResalePrice} ETH)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{Number(event.ticketsSold)} sold</span>
                <span>{Math.round(soldPct)}% sold out</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-700', soldPct >= 90 ? 'bg-red-500' : soldPct >= 60 ? 'bg-yellow-500' : 'bg-green-500')}
                  style={{ width: `${soldPct}%` }}
                />
              </div>
            </div>

            {event.description && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="font-semibold text-slate-200 mb-2">About this Event</h3>
                <p className="text-slate-400 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Organizer + contract */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Organizer:</span>
                <span className="font-mono text-xs text-slate-300">{event.organizer}</span>
              </div>
              {contractAddress && explorerBase && (
                <a
                  href={`${explorerBase}/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  View contract on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Purchase sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-6 sticky top-24">
            <div className="text-center mb-6">
              <div className="text-4xl font-black gradient-text mb-1">
                {ethers.formatEther(event.ticketPrice)} ETH
              </div>
              <p className="text-slate-500 text-sm">per ticket</p>
            </div>

            {mintedTokenId !== null && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-green-400 font-semibold mb-1">🎉 Ticket Minted!</p>
                <p className="text-sm text-slate-300">Token #{String(mintedTokenId)}</p>
                <Link to="/my-tickets" className="mt-2 inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300">
                  View My Tickets →
                </Link>
              </div>
            )}

            <TransactionStatus tx={tx} chainId={chainId} />

            {tx.status !== 'confirmed' && (
              <button
                onClick={handleBuy}
                disabled={!isUpcoming || isSoldOut || buying || tx.status === 'pending'}
                className={clsx(
                  'w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all',
                  isUpcoming && !isSoldOut
                    ? 'btn-primary'
                    : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                )}
              >
                <Ticket className="w-5 h-5" />
                {!isConnected ? 'Connect Wallet' :
                  isSoldOut ? 'Sold Out' :
                    !isUpcoming ? 'Sales Closed' :
                      buying ? 'Processing...' :
                        'Buy Ticket'}
              </button>
            )}

            {!address && (
              <p className="text-xs text-slate-500 text-center mt-3">
                You must connect your wallet to purchase.
              </p>
            )}

            <div className="mt-6 space-y-3">
              {[
                { label: 'Standard', info: 'ERC-721 NFT ticket' },
                { label: 'Network', info: chainId === 11155111 ? 'Sepolia Testnet' : 'Hardhat Local' },
                { label: 'Instant', info: 'NFT minted on purchase' },
                { label: 'Secure', info: 'On-chain verification' },
              ].map(({ label, info }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-300">{info}</span>
                </div>
              ))}
            </div>

            {Number(event.maxResaleBps) > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                  <p>Resale allowed up to {resaleCapPercent}% above original price. This cap is enforced by the smart contract.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
