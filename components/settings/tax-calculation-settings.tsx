"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { SettingsField } from "./settings-field"

interface TaxCalculationSettingsProps {
  localSettings: any
  canEdit: boolean
  handleInputChange: (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TaxCalculationSettings({ localSettings, canEdit, handleInputChange }: TaxCalculationSettingsProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  return (
    <motion.div
      className="rounded-xl border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <SettingsField label="PPN (%)">
            <motion.input
              type="number"
              inputMode="numeric"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ${focusedField === 'taxPercent' || (localSettings.taxPercent > 0) ? '' : 'text-muted-foreground/50'}`}
              disabled={!canEdit}
              value={focusedField === 'taxPercent' && localSettings.taxPercent === 0 ? '' : (localSettings.taxPercent ?? 0)}
              min={0}
              onChange={handleInputChange('taxPercent')}
              onFocus={() => setFocusedField('taxPercent')}
              onBlur={() => setFocusedField(null)}
              whileFocus={{ scale: canEdit ? 1.01 : 1 }}
              transition={{ duration: 0.05 }}
            />
          </SettingsField>

          <SettingsField label="Service (%)">
            <motion.input
              type="number"
              inputMode="numeric"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ${focusedField === 'servicePercent' || (localSettings.servicePercent > 0) ? '' : 'text-muted-foreground/50'}`}
              disabled={!canEdit}
              value={focusedField === 'servicePercent' && localSettings.servicePercent === 0 ? '' : (localSettings.servicePercent ?? 0)}
              min={0}
              onChange={handleInputChange('servicePercent')}
              onFocus={() => setFocusedField('servicePercent')}
              onBlur={() => setFocusedField(null)}
              whileFocus={{ scale: canEdit ? 1.01 : 1 }}
              transition={{ duration: 0.05 }}
            />
          </SettingsField>

          <SettingsField label="Mata Uang">
            <motion.input
              className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              disabled
              value={localSettings.currency ?? "IDR"}
              readOnly
            />
          </SettingsField>
        </div>
      </div>
    </motion.div>
  )
}
