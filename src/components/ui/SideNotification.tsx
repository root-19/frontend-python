import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

type Variant = 'success' | 'error' | 'warning' | 'info'

interface SideNotificationProps {
  open: boolean
  title: string
  sender: string
  timestamp: string
  message: string
  variant?: Variant
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
  durationMs?: number
}

export default function SideNotification({ open, title, sender, timestamp, message, variant = 'info', actionLabel, onAction, onClose, durationMs = 4000 }: SideNotificationProps) {
  useEffect(() => {
    if (!open) return
    if (actionLabel) return
    const t = setTimeout(() => {
      onClose()
    }, durationMs)
    return () => clearTimeout(t)
  }, [open, durationMs, onClose, actionLabel])

  useEffect(() => {
    if (!open || !actionLabel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (onAction) onAction()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, actionLabel, onAction, onClose])

  if (!open) return null

  const theme = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />, bar: 'bg-green-600', left: 'border-l-4 border-green-600'
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-red-600" />, bar: 'bg-red-600', left: 'border-l-4 border-red-600'
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />, bar: 'bg-yellow-500', left: 'border-l-4 border-yellow-500'
    },
    info: {
      icon: <Info className="w-5 h-5 text-[#1E3E62]" />, bar: 'bg-[#1E3E62]', left: 'border-l-4 border-[#1E3E62]'
    }
  }[variant]

  return (
    <div className="fixed z-[9999] top-2 inset-x-0 mx-2 w-auto max-w-full sm:top-6 sm:right-6 sm:left-auto sm:mx-0 sm:w-[380px] sm:max-w-sm">
      <div className={`w-full text-left bg-white ${theme.left} border border-[#1E3E62]/20 shadow-2xl rounded-xl overflow-hidden ring-1 ring-[#1E3E62]/10`}>
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            {theme.icon}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{sender} • {timestamp}</p>
              <p className="text-sm text-foreground mt-2">{message}</p>
            </div>
          </div>
          {actionLabel && (
            <div className="mt-3 flex justify-end">
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-[#1E3E62] text-white hover:bg-[#1b3758]"
                onClick={() => { if (onAction) onAction(); onClose() }}
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
        <div className="h-1 w-full bg-[#F3F4F6]">
          <div className={`h-1 ${theme.bar} animate-[notif_4s_linear]`} />
        </div>
      </div>
    </div>
  )
}
