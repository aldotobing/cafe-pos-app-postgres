"use client"

import type React from "react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface SectionCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  delay?: number
}

export function SectionCard({ title, description, icon: Icon, children, delay = 0 }: SectionCardProps) {
  return (
    <motion.div
      className="rounded-xl border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.15, ease: "easeOut" }}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/30">
        {Icon && (
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/80 text-muted-foreground shrink-0">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {/* Section Body */}
      <div className="px-4 py-4">
        {children}
      </div>
    </motion.div>
  )
}
