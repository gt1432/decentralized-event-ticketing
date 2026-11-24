import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import { EventData, CreateEventForm, TransactionState } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import TransactionStatus from '../components/TransactionStatus'
import EventCard from '../components/EventCard'
import { format, fromUnixTime } from 'date-fns'
import {
  Plus, LayoutDashboard, AlertCircle, CheckCircle,
  Calendar, Ticket, TrendingUp, RefreshCw, Users, Shield
} from 'lucide-react'
import clsx from 'clsx'

const CATEGORIES = ['Music', 'Sports', 'Technology', 'Art', 'Comedy', 'Theatre', 'Other']

const DEFAULT_FORM: CreateEventForm = {
  title: '',
  description: '',
  location: '',
  date: '',
  time: '19:00',
  imageURI: '',
  category: 'Music',
  ticketPrice: '',
  totalSupply: '',
  maxResalePercent: '20',
}

export default function OrganizerDashboard() {
  const {
    isConnected, address, chainId,
    getAllEvents, createEvent, grantVerifierRole,
    hasRole, getOrganizerRole
  } = useWalletContext()

  const [isOrganizer, setIsOrganizer] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [myEvents, setMyEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState<CreateEventForm>(DEFAULT_FORM)
  const [tx, setTx] = useState<TransactionState>({ hash: null, status: 'idle', error: null })
  const [creating, setCreating] = useState(false)
  const [verifierAddress, setVerifierAddress] = useState('')
  const [grantingRole, setGrantingRole] = useState(false)
  const [errors, setErrors] = useState<Partial<CreateEventForm>>({})

  useEffect(() => {
    if (!isConnected || !address) return
    setCheckingRole(true)
    getOrganizerRole()
      .then(role => hasRole(role, address))
      .then(has => setIsOrganizer(has))
      .finally(() => setCheckingRole(false))
  }, [isConnected, address])

  const loadEvents = async () => {
    if (!address) return
    setLoading(true)
    try {
      const all = await getAllEvents()
      setMyEvents(all.filter(e => e.organizer.toLowerCase() === address.toLowerCase()))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && isOrganizer) loadEvents()
  }, [isConnected, isOrganizer])

  const validate = (): boolean => {
    const errs: Partial<CreateEventForm> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.location.trim()) errs.location = 'Location is required'
    if (!form.date) errs.date = 'Date is required'
    if (!form.ticketPrice || Number(form.ticketPrice) <= 0) errs.ticketPrice = 'Valid price required'
    if (!form.totalSupply || Number(form.totalSupply) <= 0) errs.totalSupply = 'Valid supply required'
    if (Number(form.maxResalePercent) < 0 || Number(form.maxResalePercent) > 100) errs.maxResalePercent = '0–100'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setCreating(true)
    try {
      const dateTimestamp = Math.floor(new Date(`${form.date}T${form.time}`).getTime() / 1000)
      const eventId = await createEvent(
        {
          title: form.title,
          description: form.description,
          location: form.location,
          date: dateTimestamp,
          imageURI: form.imageURI,
          category: form.category,
          ticketPrice: ethers.parseEther(form.ticketPrice),
          totalSupply: parseInt(form.totalSupply),
          maxResaleBps: Math.round(Number(form.maxResalePercent) * 100),
        },
        setTx
      )
      if (eventId !== null) {
        setShowCreateForm(false)
        setForm(DEFAULT_FORM)
        setTx({ hash: null, status: 'idle', error: null })
        await loadEvents()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleGrantVerifier = async () => {
    if (!verifierAddress.startsWith('0x') || verifierAddress.length !== 42) {
      return
    }
    setGrantingRole(true)
    await grantVerifierRole(verifierAddress)
    setVerifierAddress('')
    setGrantingRole(false)
  }

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to access the organizer dashboard." />
  if (checkingRole) return <LoadingSpinner size="lg" message="Checking permissions..." fullPage />

  if (!isOrganizer) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 max-w-md mx-auto text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Organizer Access Required</h2>
          <p className="text-slate-400 mb-4">
            Your wallet <span className="font-mono text-xs text-slate-300">{address?.slice(0, 10)}...</span> does not have the ORGANIZER_ROLE on this contract.
          </p>
          <p className="text-sm text-slate-500">
            Ask the contract admin to grant you the organizer role, or deploy the contracts with your address as the owner.
          </p>
        </div>
      </div>
    )
  }

  const totalSold = myEvents.reduce((s, e) => s + Number(e.ticketsSold), 0)
  const totalRevenue = myEvents.reduce((s, e) => s + Number(e.ticketsSold) * Number(e.ticketPrice), 0)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black gradient-text mb-2">Organizer Dashboard</h1>
          <p className="text-slate-400">Manage your events and ticket sales</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadEvents} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={() => setShowCreateForm(f => !f)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'Create Event'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Calendar, label: 'Events', value: myEvents.length, color: 'text-purple-400' },
          { icon: Ticket, label: 'Tickets Sold', value: totalSold, color: 'text-blue-400' },
          { icon: TrendingUp, label: 'Revenue (ETH)', value: ethers.formatEther(BigInt(totalRevenue)), color: 'text-green-400' },
          { icon: Users, label: 'Active Events', value: myEvents.filter(e => e.active).length, color: 'text-yellow-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <Icon className={clsx('w-5 h-5', color)} />
            <div>
              <p className="text-2xl font-black text-slate-100">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" /> Create New Event
          </h2>

          <TransactionStatus tx={tx} chainId={chainId} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Title *</label>
              <input
                type="text"
                placeholder="Summer Music Festival 2025"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={clsx('input-field', errors.title && 'border-red-500/50')}
              />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                rows={3}
                placeholder="Describe your event..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Location / Venue *</label>
              <input
                type="text"
                placeholder="Madison Square Garden, NYC"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className={clsx('input-field', errors.location && 'border-red-500/50')}
              />
              {errors.location && <p className="text-xs text-red-400 mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-field"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date *</label>
              <input
                type="date"
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={clsx('input-field', errors.date && 'border-red-500/50')}
              />
              {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ticket Price (ETH) *</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.1"
                value={form.ticketPrice}
                onChange={e => setForm(f => ({ ...f, ticketPrice: e.target.value }))}
                className={clsx('input-field', errors.ticketPrice && 'border-red-500/50')}
              />
              {errors.ticketPrice && <p className="text-xs text-red-400 mt-1">{errors.ticketPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Total Ticket Supply *</label>
              <input
                type="number"
                min="1"
                placeholder="500"
                value={form.totalSupply}
                onChange={e => setForm(f => ({ ...f, totalSupply: e.target.value }))}
                className={clsx('input-field', errors.totalSupply && 'border-red-500/50')}
              />
              {errors.totalSupply && <p className="text-xs text-red-400 mt-1">{errors.totalSupply}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Max Resale Markup (%)
                <span className="ml-1 text-slate-500 text-xs">0 = no resale allowed</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="20"
                value={form.maxResalePercent}
                onChange={e => setForm(f => ({ ...f, maxResalePercent: e.target.value }))}
                className={clsx('input-field', errors.maxResalePercent && 'border-red-500/50')}
              />
              {errors.maxResalePercent && <p className="text-xs text-red-400 mt-1">{errors.maxResalePercent}</p>}
              <p className="text-xs text-slate-600 mt-1">This cap is enforced inside the smart contract</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Image URL</label>
              <input
                type="url"
                placeholder="https://... or ipfs://..."
                value={form.imageURI}
                onChange={e => setForm(f => ({ ...f, imageURI: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || tx.status === 'pending'}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create Event on Blockchain'}
            </button>
            <button onClick={() => { setShowCreateForm(false); setErrors({}) }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grant Verifier Role */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" /> Grant Verifier Role
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Grant VERIFIER_ROLE to an event staff member's wallet address so they can redeem tickets on-chain.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="0x... staff wallet address"
            value={verifierAddress}
            onChange={e => setVerifierAddress(e.target.value)}
            className="input-field flex-1"
          />
          <button
            onClick={handleGrantVerifier}
            disabled={grantingRole}
            className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
          >
            {grantingRole ? 'Granting...' : 'Grant Role'}
          </button>
        </div>
      </div>

      {/* My Events */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-6">My Events</h2>
        {loading ? (
          <LoadingSpinner message="Loading events..." />
        ) : myEvents.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">You haven't created any events yet.</p>
            <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myEvents.map(ev => (
              <EventCard key={String(ev.eventId)} event={ev} showBuyButton={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
