"use client"

import { useTheme } from "next-themes"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"

export function ToasterWithTheme() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Toaster 
      theme={theme as any}
      richColors
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '12px 16px',
          width: 'max-content',
          maxWidth: '320px',
        },
      }}
    />
  )
}
