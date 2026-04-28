"use client"

import { useState } from "react"
import { Calculator } from "lucide-react"
import { motion } from "framer-motion"
import { SectionCard } from "./section-card"
import { SettingsField } from "./settings-field"

interface TaxCalculationSettingsProps {
  localSettings: any
  canEdit: boolean
  handleInputChange: (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TaxCalculationSettings({ localSettings, canEdit, handleInputChange }: TaxCalculationSettingsProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const isZeroOrEmpty = (value: number | null | undefined) =>
    value === 0 || value === null || value === undefined

  return (
    <SectionCard
      title="Pajak & Kalkulasi"
      description="Atur tarif pajak, biaya layanan, dan mata uang"
      icon={Calculator}
      delay={0.04}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SettingsField label="PPN (%)">
          <div className="relative">
            <motion.input
              type="number"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                (focusedField === 'taxPercent' || (localSettings.taxPercent && localSettings.taxPercent > 0)) ? '' : 'text-transparent'
              }`}
              disabled={!canEdit}
              value={focusedField === 'taxPercent' && localSettings.taxPercent === 0 ? '' : (localSettings.taxPercent ?? 0)}
              min={0}
              onChange={handleInputChange('taxPercent')}
              onFocus={() => setFocusedField('taxPercent')}
              onBlur={() => setFocusedField(null)}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.05 }}
            />
            {focusedField !== 'taxPercent' && isZeroOrEmpty(localSettings.taxPercent) && (
              <div className="absolute inset-0 flex items-center px-3 text-sm text-muted-foreground pointer-events-none">
                0
              </div>
            )}
          </div>
        </SettingsField>

        <SettingsField label="Service (%)">
          <div className="relative">
            <motion.input
              type="number"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                (focusedField === 'servicePercent' || (localSettings.servicePercent && localSettings.servicePercent > 0)) ? '' : 'text-transparent'
              }`}
              disabled={!canEdit}
              value={focusedField === 'servicePercent' && localSettings.servicePercent === 0 ? '' : (localSettings.servicePercent ?? 0)}
              min={0}
              onChange={handleInputChange('servicePercent')}
              onFocus={() => setFocusedField('servicePercent')}
              onBlur={() => setFocusedField(null)}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.05 }}
            />
            {focusedField !== 'servicePercent' && isZeroOrEmpty(localSettings.servicePercent) && (
              <div className="absolute inset-0 flex items-center px-3 text-sm text-muted-foreground pointer-events-none">
                0
              </div>
            )}
          </div>
        </SettingsField>

        <div className="col-span-2 sm:col-span-1">
          <SettingsField label="Mata Uang">
            <motion.input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled
              value={localSettings.currency ?? "IDR"}
              readOnly
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.05 }}
            />
          </SettingsField>
        </div>
      </div>
    </SectionCard>
  )
}
