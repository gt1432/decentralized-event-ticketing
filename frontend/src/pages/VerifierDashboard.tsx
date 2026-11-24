import React, { useEffect, useRef, useState } from 'react'
import { useWalletContext } from '../context/WalletContext'
import { QRTicketPayload, TicketVerificationStatus, TransactionState } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectWalletPrompt from '../components/ConnectWalletPrompt'
import TransactionStatus from '../components/TransactionStatus'
import { Html5Qrcode } from 'html5-qrcode'
import {
  QrCode, Shield, CheckCircle, XCircle, AlertTriangle,
  Camera, StopCircle, RefreshCw, Hash
} from 'lucide-react'
import clsx from 'clsx'

interface VerificationResult {
  status: TicketVerificationStatus
  tokenId: bigint | null
  eventId: bigint | null
  owner: string | null
  message: string
  details: string | null
}

export default function VerifierDashboard() {
  const {
    isConnected, address, chainId, contractAddress,
    isTicketValid, getTicket, getEvent,
    redeemTicket, hasRole, getVerifierRole, getOrganizerRole
  } = useWalletContext()

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [tx, setTx] = useState<TransactionState>({ hash: null, status: 'idle', error: null })
  const [redeeming, setRedeeming] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [manualEventId, setManualEventId] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isConnected || !address) return
    setCheckingRole(true)
    Promise.all([getVerifierRole(), getOrganizerRole()]).then(async ([vRole, oRole]) => {
      const [isVerifier, isOrg] = await Promise.all([
        hasRole(vRole, address),
        hasRole(oRole, address),
      ])
      setIsAuthorized(isVerifier || isOrg)
    }).finally(() => setCheckingRole(false))
  }, [isConnected, address])

  const startScanner = async () => {
    if (!scannerDivRef.current) return
    setScanning(true)
    setResult(null)

    try {
      const scanner = new Html5Qrcode('qr-scanner-div')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop()
          setScanning(false)
          await processQRData(decodedText)
        },
        undefined
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const processQRData = async (raw: string) => {
    try {
      const payload = JSON.parse(raw) as QRTicketPayload

      // Validate payload structure
      if (!payload.contractAddress || !payload.tokenId || !payload.eventId) {
        setResult({ status: 'invalid', tokenId: null, eventId: null, owner: null, message: 'Invalid QR Code', details: 'QR data is malformed or not a ChainTickets ticket.' })
        return
      }

      // Verify contract address matches current contract
      if (contractAddress && payload.contractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
        setResult({ status: 'invalid', tokenId: null, eventId: null, owner: null, message: 'Wrong Contract', details: `QR code is for a different contract: ${payload.contractAddress}` })
        return
      }

      const tokenId = BigInt(payload.tokenId)
      const eventId = BigInt(payload.eventId)

      await verifyTicket(tokenId, eventId)
    } catch {
      setResult({ status: 'invalid', tokenId: null, eventId: null, owner: null, message: 'Invalid QR Code', details: 'Could not parse QR code data.' })
    }
  }

  const verifyTicket = async (tokenId: bigint, eventId: bigint) => {
    // Always verify against blockchain state — never trust QR alone
    const [validity, ticketData] = await Promise.all([
      isTicketValid(tokenId, eventId),
      getTicket(tokenId),
    ])

    let owner: string | null = null
    try {
      if (ticketData) {
        // We get owner by checking the original buyer & redemption state
        owner = ticketData.originalBuyer
      }
    } catch { /* non-critical */ }

    if (!ticketData) {
      setResult({ status: 'invalid', tokenId, eventId, owner: null, message: 'Ticket Not Found', details: 'No ticket exists for this token ID.' })
      return
    }

    if (ticketData.redeemed) {
      setResult({ status: 'already_used', tokenId, eventId, owner, message: 'Already Redeemed', details: 'This ticket has already been used to enter the event.' })
      return
    }

    if (!validity.valid) {
      if (validity.reason === 'Wrong event') {
        setResult({ status: 'wrong_event', tokenId, eventId, owner, message: 'Wrong Event', details: `This ticket belongs to event #${String(ticketData.eventId)}, not event #${String(eventId)}.` })
      } else {
        setResult({ status: 'invalid', tokenId, eventId, owner, message: 'Invalid Ticket', details: validity.reason })
      }
      return
    }

    setResult({ status: 'valid', tokenId, eventId, owner, message: 'Valid Ticket', details: 'Ticket is valid and ready to be redeemed.' })
  }

  const handleRedeem = async () => {
    if (!result?.tokenId || !result?.eventId) return
    setRedeeming(true)
    const ok = await redeemTicket(result.tokenId, result.eventId, setTx)
    if (ok) {
      setResult(prev => prev ? { ...prev, status: 'already_used', message: 'Ticket Redeemed', details: 'Entry confirmed. Ticket marked as used on-chain.' } : prev)
    }
    setRedeeming(false)
  }

  const handleManualVerify = async () => {
    if (!manualInput || !manualEventId) return
    try {
      const tokenId = BigInt(manualInput)
      const eventId = BigInt(manualEventId)
      setResult(null)
      await verifyTicket(tokenId, eventId)
    } catch {
      setResult({ status: 'invalid', tokenId: null, eventId: null, owner: null, message: 'Invalid Input', details: 'Token ID and Event ID must be valid numbers.' })
    }
  }

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to access the ticket verifier." />
  if (checkingRole) return <LoadingSpinner size="lg" message="Checking verifier permissions..." fullPage />

  if (!isAuthorized) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 max-w-md mx-auto text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Verifier Access Required</h2>
          <p className="text-slate-400">
            Your wallet does not have the VERIFIER_ROLE. Ask the event organizer to grant you access through the Organizer Dashboard.
          </p>
        </div>
      </div>
    )
  }

  const statusStyles: Record<TicketVerificationStatus, { bg: string; border: string; icon: React.ReactNode; color: string }> = {
    valid:        { bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: <CheckCircle className="w-8 h-8 text-green-400" />,   color: 'text-green-400' },
    already_used: { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: <XCircle className="w-8 h-8 text-gray-400" />,        color: 'text-gray-400' },
    invalid:      { bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: <XCircle className="w-8 h-8 text-red-400" />,         color: 'text-red-400' },
    wrong_event:  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <AlertTriangle className="w-8 h-8 text-yellow-400" />, color: 'text-yellow-400' },
    unknown:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <QrCode className="w-8 h-8 text-blue-400" />,         color: 'text-blue-400' },
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-4xl font-black gradient-text mb-2">Ticket Verifier</h1>
        <p className="text-slate-400">Scan and verify NFT tickets on-chain</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner */}
        <div className="space-y-5">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" /> QR Scanner
            </h2>

            {/* Scanner div — Html5Qrcode renders into this */}
            <div
              id="qr-scanner-div"
              ref={scannerDivRef}
              className={clsx(
                'w-full rounded-xl overflow-hidden mb-4',
                scanning ? 'h-80' : 'h-0'
              )}
            />

            {!scanning ? (
              <button onClick={startScanner} className="btn-primary w-full flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Start Camera Scanner
              </button>
            ) : (
              <button onClick={stopScanner} className="btn-danger w-full flex items-center justify-center gap-2">
                <StopCircle className="w-4 h-4" /> Stop Scanner
              </button>
            )}
          </div>

          {/* Manual entry */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-400" /> Manual Verification
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Token ID</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Event ID</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manualEventId}
                  onChange={e => setManualEventId(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <button
                onClick={handleManualVerify}
                disabled={!manualInput || !manualEventId}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Verify Manually
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="space-y-5">
          {result ? (
            <>
              <div className={clsx('glass-card p-8 border text-center', statusStyles[result.status].bg, statusStyles[result.status].border)}>
                <div className="flex justify-center mb-4">{statusStyles[result.status].icon}</div>
                <h2 className={clsx('text-2xl font-black mb-2', statusStyles[result.status].color)}>
                  {result.message}
                </h2>
                {result.details && <p className="text-slate-400 text-sm">{result.details}</p>}

                {result.tokenId !== null && (
                  <div className="mt-6 space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Token ID</span>
                      <span className="text-slate-200 font-mono">#{String(result.tokenId)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Event ID</span>
                      <span className="text-slate-200 font-mono">#{String(result.eventId)}</span>
                    </div>
                    {result.owner && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Original Buyer</span>
                        <span className="text-slate-200 font-mono text-xs">{result.owner.slice(0, 10)}...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Redeem button — only for valid tickets */}
              {result.status === 'valid' && result.tokenId !== null && result.eventId !== null && (
                <div className="glass-card p-6">
                  <TransactionStatus tx={tx} chainId={chainId} />
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming || tx.status === 'pending'}
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-3"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {redeeming ? 'Redeeming on-chain...' : 'Confirm Entry & Redeem Ticket'}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    This will mark the ticket as permanently used on the blockchain.
                  </p>
                </div>
              )}

              <button
                onClick={() => { setResult(null); setTx({ hash: null, status: 'idle', error: null }) }}
                className="btn-secondary w-full text-sm"
              >
                Scan Another Ticket
              </button>
            </>
          ) : (
            <div className="glass-card p-12 text-center h-64 flex flex-col items-center justify-center">
              <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Scan a QR code or enter ticket details manually to verify.</p>
              <p className="text-xs text-slate-600 mt-2">Verification checks blockchain state — never trusts QR alone.</p>
            </div>
          )}

          {/* Security notice */}
          <div className="glass-card p-4 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 leading-relaxed">
                <p className="font-medium text-slate-400 mb-1">On-Chain Verification</p>
                <p>Every ticket check reads directly from the smart contract. QR codes are verified against blockchain state — a forged QR code will always fail. Redemption is an on-chain transaction that permanently prevents re-entry.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
