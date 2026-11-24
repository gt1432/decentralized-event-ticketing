import { Link } from 'react-router-dom'
import { ArrowLeft, Ghost } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <Ghost className="w-20 h-20 text-slate-700 mb-6 animate-float" />
      <h1 className="text-6xl font-black gradient-text mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-300 mb-3">Page Not Found</h2>
      <p className="text-slate-500 max-w-sm mb-8">
        This page doesn't exist on the blockchain or anywhere else.
      </p>
      <Link to="/" className="btn-primary flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  )
}
