import React from 'react'

type NeonBadgeProps = {
  children: React.ReactNode
  intent?: 'success' | 'warning' | 'destructive' | 'info' | 'admin'
  className?: string
}

export default function NeonBadge({ children, intent = 'info', className = '' }: NeonBadgeProps) {
  const colors: Record<string, string> = {
    success: 'bg-success/20 text-success shadow-success/30',
    warning: 'bg-warning/20 text-warning shadow-warning/30',
    destructive: 'bg-destructive/20 text-destructive shadow-destructive/30',
    info: 'bg-accent/20 text-accent shadow-accent/30',
    admin: 'bg-[#1E3A8A]/15 text-[#1E3A8A] shadow-[#1E3A8A]/30',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${colors[intent]} ${className}`}>
      {children}
    </span>
  )
}
