import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  fullPage?: boolean
}

export default function LoadingSpinner({ size = 'md', message, fullPage }: Props) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className={clsx(sizeClasses[size], 'text-purple-400 animate-spin')} />
        {message && <p className="text-slate-400 text-sm">{message}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 className={clsx(sizeClasses[size], 'text-purple-400 animate-spin')} />
      {message && <p className="text-slate-400 text-sm">{message}</p>}
    </div>
  )
}
