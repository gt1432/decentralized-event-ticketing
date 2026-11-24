import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QRTicketPayload } from '../types'
import { Download, QrCode } from 'lucide-react'

interface Props {
  payload: QRTicketPayload
  size?: number
  showDownload?: boolean
}

export default function QRCodeDisplay({ payload, size = 200, showDownload = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  // The QR payload contains only public, verifiable information.
  // It does NOT contain private keys, seed phrases, or personal user data.
  const qrData = JSON.stringify(payload)

  useEffect(() => {
    if (!canvasRef.current) return

    QRCode.toCanvas(canvasRef.current, qrData, {
      width: size,
      margin: 2,
      color: {
        dark: '#a855f7',
        light: '#050d1f',
      },
      errorCorrectionLevel: 'H',
    }).catch(err => {
      console.error('QR generation error:', err)
      setError('Failed to generate QR code')
    })
  }, [qrData, size])

  const downloadQR = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `ticket-${payload.tokenId}-${payload.eventId}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 glass-card">
        <QrCode className="w-10 h-10 text-slate-600" />
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 rounded-2xl bg-navy-800 border border-purple-500/20 shadow-lg shadow-purple-500/10">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      {showDownload && (
        <button
          onClick={downloadQR}
          className="btn-secondary flex items-center gap-2 text-sm py-2"
        >
          <Download className="w-4 h-4" />
          Download QR Code
        </button>
      )}

      <div className="text-xs text-slate-600 text-center max-w-xs">
        <p>This QR code contains your ticket's public verification data.</p>
        <p className="mt-1 font-mono">Token #{payload.tokenId} · Event #{payload.eventId}</p>
      </div>
    </div>
  )
}
