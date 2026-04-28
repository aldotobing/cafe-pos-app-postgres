"use client"

import { Store } from "lucide-react"
import { SectionCard } from "./section-card"
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
    <SectionCard
      title="Informasi Toko"
      description="Nama, alamat, dan identitas toko Anda"
      icon={Store}
      delay={0.02}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <SettingsField label="Logo Toko" hint={!canEdit ? "Hanya admin yang dapat mengubah logo" : undefined}>
            <ImageUpload
              value={localSettings.logoUrl ?? ""}
              onChange={async (url) => {
                if (localSettings.logoUrl && localSettings.logoUrl !== url) {
                  try {
                    await fetch('/api/upload/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: localSettings.logoUrl, folder: 'cafe' }),
                    });
                  } catch (err) {
                    // silently fail
                  }
                }
                setLocalSettings((prev: any) => ({ ...prev, logoUrl: url || undefined }));
              }}
              label="Upload Logo"
              folder="cafe"
              disabled={!canEdit}
            />
          </SettingsField>
        </div>
      </div>
    </SectionCard>
  )
}
