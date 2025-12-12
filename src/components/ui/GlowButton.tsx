import { motion } from 'framer-motion'
import React from 'react'

type GlowButtonProps = React.ComponentProps<typeof motion.button>

export default function GlowButton({ children, className = '', ...props }: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      className={`px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
