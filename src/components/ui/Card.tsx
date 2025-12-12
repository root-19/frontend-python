import React from 'react'

interface CardProps {
  title?: string
  className?: string
  children: React.ReactNode
}

export default function Card({ title, className, children }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow p-6 transition-transform duration-200 ease-out hover:scale-[1.02] ${className || ''}`}>
      {title && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
        </div>
      )}
      {children}
    </div>
  )
}

