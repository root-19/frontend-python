import { motion } from 'framer-motion'
import React from 'react'

type GlassCardProps = React.PropsWithChildren<{
  className?: string
  title?: string
  subtitle?: string
  headerRight?: React.ReactNode
}>

export default function GlassCard({ className = '', title, subtitle, headerRight, children }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl bg-panel backdrop-blur-md border border-border shadow-lg shadow-primary/10 ${className}`}
    >
      {(title || subtitle || headerRight) && (
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div className={title ? 'p-5 pt-3' : 'p-5'}>
        {children}
      </div>
    </motion.div>
  )
}
