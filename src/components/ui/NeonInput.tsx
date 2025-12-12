import React from 'react'

type NeonInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  id?: string
}

export default function NeonInput({ label, id, className = '', ...props }: NeonInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-3 rounded-2xl bg-white text-foreground placeholder:text-placeholder border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF] shadow-inner ${className}`}
        {...props}
      />
    </div>
  )
}
