"use client"

import { motion } from "framer-motion"

interface SettingsFieldProps {
  label: string
  children: React.ReactNode
  hint?: string
}

export function SettingsField({ label, children, hint }: SettingsFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </div>
  )
}

interface SettingsInputProps {
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  type?: string
  readOnly?: boolean
  min?: number
}

export function SettingsInput({ value, onChange, placeholder, disabled, type = "text", readOnly, min }: SettingsInputProps) {
  return (
    <motion.input
      type={type}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      min={min}
      whileFocus={{ scale: 1.01 }}
      transition={{ duration: 0.05 }}
    />
  )
}
