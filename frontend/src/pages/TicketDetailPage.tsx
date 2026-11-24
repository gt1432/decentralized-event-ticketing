import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import { TicketData, EventData, QRTicketPayload, TransactionState } from '../types'
import { EXPLORER_URLS } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import QRCodeDisplay from '../components/QRCodeDisplay'
import TransactionStatus from '../components/TransactionStatus'
import { format, fromUnixTime } from 'date-fns'
import {
  ArrowLeft, Ticket, Calendar, MapPin, ExternalLink,
  Tag, Hash, Clock, CheckCircle, TrendingUp, AlertCircle
} from 'lucide-react'
import clsx from 'clsx'

export default function TicketDetailPage() {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>()
  const {
    isConnected, address, chainId, contractAddress,
    getTicket, getEvent,
    listTicketForResale, cancelResaleListing, getResaleListing
  } = useWalletContext()

  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [listingPrice, setListingPrice] = useState('')
  const [isListed, setIsListed] = useState(false)
  const [tx, setTx] = useState<TransactionState>({ hash: null, status: 'idle', error: null })
  const [showListForm, setShowListForm] = useState(false)

  const tokenId = tokenIdParam ? BigInt(tokenIdParam) : null

  useEffect(() => {
    if (!isConnected || tokenId === null) return
    setLoading(true)
    Promise.all([
      getTicket(tokenId),
      getResaleListing(tokenId),
    ]).then(async ([tkt, listing]) => {
      setTicket(tkt)
      setIsListed(listing?.active ?? false)
      if (tkt) {
        const ev = await getEvent(tkt.eventId)
        setEvent(ev)
      }
    }).finally(() => setLoading(false))
  }, [isConnected, tokenId])

  const handleList = async () => {
    if (!tokenId || !listingPrice) return
    try {
      const price = ethers.parseEther(listingPrice)
      const ok = await listTicketForResale(tokenId, price, setTx)
      if (ok) { setIsListed(true); setShowListForm(false) }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCancelListing = async () => {
    if (!tokenId) return
    const ok = await cancelResaleListing(tokenId, setTx)
    if (ok) setIsListed(false)
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view your ticket details." />
  }
  if (loading) return <LoadingSpinner size="lg" message="Loading ticket..." fullPage />

  if (!ticket) {
    return (
      <div className="page-container text-center py-20">
        <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-300 mb-2">Ticket Not Found</h2>
        <Link to="/my-tickets" className="btn-secondary inline-flex items-center gap-2 mt-4">
          <ArrowLeft className="w-4 h-4" /> My Tickets
        </Link>
      </div>
    )
  }

  const explorerBase = chainId ? EXPLORER_URLS[chainId] ?? '' : ''
  const isOwner = address?.toLowerCase() === undefined // We show regardless; contract enforces ownership

  const qrPayload: QRTicketPayload = {
    contractAddress: contractAddress || '',
    tokenId: String(tokenId),
    eventId: String(ticket.eventId),
    chainId: chainId ?? 31337,
    version: '1',
  }

  const maxResalePrice = event
    ? ethers.formatEther(ticket.originalPrice + (ticket.originalPrice * event.maxResaleBps / 10000n))
    : null

  return (
    <div className="page-container">
      <Link to="/my-tickets" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> My Tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code */}
        <div className="glass-card p-8 flex flex-col items-center">
          <h2 className="text-xl font-bold gradient-text mb-6">Your Ticket QR Code</h2>
          <QRCodeDisplay payload={qrPayload} size={240} />
          <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center max-w-xs">
            <p className="text-xs text-slate-400 leading-relaxed">
              Present this QR code at the venue entrance. Staff will scan and verify it against the blockchain. It encodes only your ticket's public identifiers — no private keys.
            </p>
          </div>
          {ticket.redeemed && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/20 border border-gray-500/30">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">This ticket has been redeemed</span>
            </div>
          )}
        </div>

        {/* Ticket Details */}
        <div className="space-y-5">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-100">Ticket Details</h2>
              {ticket.redeemed ? (
                <span className="badge-gray flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Used</span>
              ) : (
                <span className="badge-green flex items-center gap-1"><Clock className="w-3 h-3" /> Valid</span>
              )}
            </div>

            <div className="space-y-3">
              {[
                { icon: Hash, label: 'Token ID', value: `#${String(tokenId)}`, color: 'text-purple-400' },
                { icon: Tag, label: 'Event ID', value: `#${String(ticket.eventId)}`, color: 'text-blue-400' },
                { icon: Ticket, label: 'Original Price', value: `${ethers.formatEther(ticket.originalPrice)} ETH`, color: 'text-green-400' },
                { icon: Clock, label: 'Purchased', value: format(fromUnixTime(Number(ticket.purchaseTime)), 'MMM d, yyyy HH:mm'), color: 'text-yellow-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={clsx('w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center')}>
                    <Icon className={clsx('w-4 h-4', color)} />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-medium text-slate-200">{value}</span>
                  </div>
                </div>
              ))}
              {ticket.redeemed && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-sm text-slate-500">Redeemed</span>
                    <span className="text-sm font-medium text-slate-200">
                      {format(fromUnixTime(Number(ticket.redemptionTime)), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {explorerBase && contractAddress && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <a
                  href={`${explorerBase}/token/${contractAddress}?a=${String(tokenId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View NFT on Etherscan
                </a>
              </div>
            )}
          </div>

          {/* Event Info */}
          {event && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> Event
              </h3>
              <p className="font-bold text-slate-100 mb-2">{event.title}</p>
              <div className="space-y-1.5 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {format(fromUnixTime(Number(event.date)), 'MMMM d, yyyy · h:mm a')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {event.location}
                </div>
              </div>
            </div>
          )}

          {/* Resale */}
          {!ticket.redeemed && event && Number(event.maxResaleBps) > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" /> Resale
              </h3>

              <TransactionStatus tx={tx} chainId={chainId} />

              {isListed ? (
                <div className="mt-3">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 mb-3">
                    <p className="text-sm text-green-400">Your ticket is listed for resale.</p>
                  </div>
                  <button onClick={handleCancelListing} className="btn-danger text-sm w-full">
                    Cancel Listing
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Max resale price: {maxResalePrice} ETH (+{(Number(event.maxResaleBps) / 100).toFixed(0)}% cap enforced on-chain)
                  </p>
                  {!showListForm ? (
                    <button
                      onClick={() => setShowListForm(true)}
                      className="btn-secondary text-sm w-full"
                    >
                      List for Resale
                    </button>
                  ) : (
                    <div className="space-y-3 animate-slide-up">
                      <input
                        type="number"
                        step="0.001"
                        placeholder={`Max ${maxResalePrice} ETH`}
                        value={listingPrice}
                        onChange={e => setListingPrice(e.target.value)}
                        className="input-field text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleList} className="btn-primary flex-1 text-sm py-2">
                          Confirm Listing
                        </button>
                        <button onClick={() => setShowListForm(false)} className="btn-secondary text-sm py-2 px-4">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
