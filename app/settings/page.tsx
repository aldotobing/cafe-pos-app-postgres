"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useState, useRef } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import { cafeSettingsApi } from "@/lib/api"
import { Save, Loader2, Store, Bell, Calculator, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"

import { GeneralSettings } from "@/components/settings/general-settings"
import { TaxCalculationSettings } from "@/components/settings/tax-calculation-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { CashierManagement } from "@/components/settings/cashier-management"

type SectionId = 'store' | 'tax' | 'notification' | 'cashier'

interface MenuItem {
  id: SectionId
  label: string
  icon: React.ElementType
  color: string
  bg: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { id: 'store', label: 'Informasi Toko', icon: Store, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 'tax', label: 'Pajak & Kalkulasi', icon: Calculator, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: 'notification', label: 'Notifikasi', icon: Bell, color: "text-violet-500", bg: "bg-violet-500/10", adminOnly: true },
  { id: 'cashier', label: 'Manajemen Kasir', icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", adminOnly: true },
]

export default function Page() {
  const { userData, loading: authLoading, user } = useAuth()
  const searchParams = useSearchParams()
  const urlCafeId = searchParams.get('cafe_id')
  const cafeId = (userData?.role === 'superadmin' && urlCafeId) ? Number(urlCafeId) : userData?.cafe_id
  const { settings, isLoading: settingsLoading, mutate: mutateSettings } = useCafeSettings(cafeId)
  const router = useRouter()
  const [localSettings, setLocalSettings] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('store')
  const initialRef = useRef<any>(null)

  const canEdit = userData?.role === "admin" || userData?.role === "superadmin"

  useEffect(() => {
    if (!authLoading && (!user || !userData)) { router.push('/login'); return }
    if (!authLoading && user && userData) {
      if (userData.role === 'cashier' && !userData.cafe_id) { router.push('/login'); return }
      if (userData.role === 'admin' && !userData.cafe_id) { router.push('/create-cafe'); return }
    }
  }, [user, userData, authLoading, router])

  useEffect(() => {
    if (settings && !initialRef.current) {
      const s = {
        name: settings.name ?? '', phone: settings.phone ?? '', address: settings.address ?? '',
        logoUrl: settings.logoUrl ?? '', taxPercent: settings.taxPercent ?? 0,
        servicePercent: settings.servicePercent ?? 0, currency: settings.currency ?? 'IDR',
        enablePushNotifications: !!settings.enablePushNotifications, id: settings.id,
      }
      setLocalSettings(s)
      initialRef.current = s
    }
  }, [settings])

  useEffect(() => {
    if (!initialRef.current) return
    setHasChanges(Object.keys(initialRef.current).some(k => localSettings[k] !== initialRef.current[k]))
  }, [localSettings])

  const handleInputChange = (field: keyof typeof localSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'number' ? Number(e.target.value) || 0 : e.target.value
      setLocalSettings((prev: any) => ({ ...prev, [field]: value }))
    }

  const saveSettings = async (silent = false) => {
    if (!canEdit || !localSettings.id) return
    setIsSaving(true)
    try {
      await cafeSettingsApi.update(localSettings.id, localSettings)
      initialRef.current = { ...localSettings }
      setHasChanges(false)
      await mutateSettings()
      if (!silent) toast.success('Pengaturan berhasil disimpan')
    } catch (error: any) {
      if (!silent) toast.error(error.message || 'Gagal menyimpan pengaturan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationSettingUpdate = async (s: any) => {
    if (!localSettings.id) return
    await cafeSettingsApi.update(localSettings.id, s)
    setLocalSettings((prev: any) => ({ ...prev, ...s }))
    initialRef.current = { ...initialRef.current, ...s }
    await mutateSettings()
  }

  const activeItem = menuItems.find(m => m.id === activeSection)!

  if (authLoading || settingsLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Memuat pengaturan...</span>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar — desktop only */}
        <nav className="w-[200px] shrink-0 hidden md:block">
          <div className="space-y-0.5 sticky top-[calc(4rem+1px)]">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeSection === item.id
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", activeSection === item.id ? item.color : "text-muted-foreground")} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border",
                  activeSection === item.id
                    ? "bg-accent border-border text-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {!canEdit && (
            <div className="mb-4 text-amber-700 text-xs flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Mode lihat saja — Anda tidak dapat mengubah pengaturan
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn("flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg shrink-0", activeItem.bg)}>
              <activeItem.icon className={cn("h-4 w-4 md:h-[18px] md:w-[18px]", activeItem.color)} />
            </div>
            <h2 className="text-sm md:text-base font-semibold">{activeItem.label}</h2>

            {hasChanges && (
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => {
                    setLocalSettings({ ...initialRef.current! })
                    setHasChanges(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => saveSettings()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {isSaving ? '' : 'Simpan'}
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === 'store' && (
                <GeneralSettings
                  localSettings={localSettings}
                  setLocalSettings={setLocalSettings}
                  canEdit={canEdit}
                  handleInputChange={handleInputChange}
                />
              )}

              {activeSection === 'tax' && (
                <TaxCalculationSettings
                  localSettings={localSettings}
                  canEdit={canEdit}
                  handleInputChange={handleInputChange}
                />
              )}

              {activeSection === 'notification' && (
                <NotificationSettings
                  localSettings={localSettings}
                  setLocalSettings={setLocalSettings}
                  setSettings={handleNotificationSettingUpdate}
                  userId={user?.id}
                  cafeId={cafeId}
                  canEdit={canEdit}
                />
              )}

              {activeSection === 'cashier' && (
                <CashierManagement
                  userId={user?.id}
                  cafeId={cafeId}
                  canEdit={canEdit}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  )
}
