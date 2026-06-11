"use client"

import { useTheme } from "next-themes"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"

const ANIMATION_CSS = `
  [data-sonner-toaster][data-y-position="top"] [data-sonner-toast] {
    --initial-translate-y: -12px;
    transition: transform 0.35s cubic-bezier(0.21, 0.45, 0.18, 1),
                opacity 0.25s ease-out !important;
  }
  [data-sonner-toaster][data-y-position="bottom"] [data-sonner-toast] {
    --initial-translate-y: 8px;
    transition: transform 0.35s cubic-bezier(0.21, 0.45, 0.18, 1),
                opacity 0.2s ease-out !important;
  }
  [data-sonner-toaster] [data-sonner-toast][data-styled="true"] {
    transition: transform 0.35s cubic-bezier(0.21, 0.45, 0.18, 1),
                opacity 0.25s ease-out,
                height 0.35s cubic-bezier(0.21, 0.45, 0.18, 1) !important;
  }
  [data-sonner-toaster] [data-sonner-toast][data-removed="true"] {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.2s ease-in !important;
  }
`

export function ToasterWithTheme() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const style = document.createElement("style")
    style.id = "toaster-animations"
    style.textContent = ANIMATION_CSS
    document.head.appendChild(style)
    return () => {
      const existing = document.getElementById("toaster-animations")
      if (existing) existing.remove()
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <Toaster
      position="top-center"
      gap={isMobile ? 6 : 8}
      offset={isMobile ? "5rem" : "1rem"}
      theme={theme as any}
      richColors
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: isMobile ? "0.8125rem" : "0.875rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          padding: isMobile ? "10px 14px" : "12px 18px",
          width: "max-content",
          maxWidth: isMobile ? "calc(100vw - 32px)" : "340px",
        },
      }}
    />
  )
}
