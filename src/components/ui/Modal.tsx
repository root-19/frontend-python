import React from 'react'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export default function Modal({ open, title, onClose, children, actions, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-[96%] sm:w-[92%] max-w-3xl sm:max-w-4xl p-6 max-h-[85vh] overflow-y-auto ${className || ''}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
        )}
        <div>{children}</div>
        {actions && (
          <div className="mt-6 flex items-center justify-end gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
