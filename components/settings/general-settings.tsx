"use client"

import { motion } from "framer-motion"
import type React from "react"
import { SettingsField, SettingsInput } from "./settings-field"
import { ImageUpload } from "@/components/ui/image-upload"

interface GeneralSettingsProps {
  localSettings: any
  setLocalSettings: React.Dispatch<React.SetStateAction<any>>
  canEdit: boolean
  handleInputChange: (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function GeneralSettings({ localSettings, setLocalSettings, canEdit, handleInputChange }: GeneralSettingsProps) {
  return (
    <motion.div
      className="rounded-xl border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <SettingsField label="Nama Toko">
            <SettingsInput
              value={localSettings.name ?? ""}
              onChange={handleInputChange('name')}
              placeholder="Masukkan nama toko"
              disabled={!canEdit}
            />
          </SettingsField>

          <SettingsField label="Nomor Telepon">
            <SettingsInput
              value={localSettings.phone ?? ""}
              onChange={handleInputChange('phone')}
              placeholder="Masukkan nomor telepon"
              disabled={!canEdit}
            />
          </SettingsField>

          <div className="sm:col-span-2">
            <SettingsField label="Alamat">
              <SettingsInput
                value={localSettings.address ?? ""}
                onChange={handleInputChange('address')}
                placeholder="Masukkan alamat lengkap"
                disabled={!canEdit}
              />
            </SettingsField>
          </div>

          <div className="sm:col-span-2">
            <SettingsField label="Logo Toko">
              <ImageUpload
                value={localSettings.logoUrl ?? ""}
                onChange={async (url) => {
                  if (localSettings.logoUrl && localSettings.logoUrl !== url) {
                    try {
                      await fetch('/api/upload/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: localSettings.logoUrl, folder: 'cafe' }),
                      })
                    } catch {}
                  }
                  setLocalSettings((prev: any) => ({ ...prev, logoUrl: url || undefined }))
                }}
                label="Upload Logo"
                folder="cafe"
                disabled={!canEdit}
              />
            </SettingsField>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
