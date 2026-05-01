"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useState } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import { cafeSettingsApi } from "@/lib/api"
import { Save, Loader2, Settings } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

import { GeneralSettings } from "@/components/settings/general-settings"
import { TaxCalculationSettings } from "@/components/settings/tax-calculation-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { CashierManagement } from "@/components/settings/cashier-management"

export default function Page() {
  const { userData, loading: authLoading, user } = useAuth()
  const searchParams = useSearchParams()
  const urlCafeId = searchParams.get('cafe_id')
  const cafeId = (userData?.role === 'superadmin' && urlCafeId) ? Number(urlCafeId) : userData?.cafe_id;
  const { settings, isLoading: settingsLoading, mutate: mutateSettings } = useCafeSettings(cafeId)
  const router = useRouter()
  const [localSettings, setLocalSettings] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Check authentication - redirect if not logged in
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    // Check approval status for regular admin users
    if (!authLoading && user && userData) {
      if (!userData.is_approved && userData.role !== 'superadmin') {
        router.push('/pending-approval');
        return;
      }

      // For cashier users, ensure they're assigned to a cafe
      if (userData.role === 'cashier' && !userData.cafe_id) {
        router.push('/login');
        return;
      }

      // For admin users who don't have a cafe assigned, redirect to create cafe
      if (userData.role === 'admin' && !userData.cafe_id) {
        router.push('/create-cafe');
        return;
      }
    }
  }, [user, userData, authLoading, router]);

  // Update local settings when hook settings change
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        ...settings,
        enablePushNotifications: !!settings.enablePushNotifications
      });
    }
  }, [settings]);

  // Show loading state
  if (authLoading || settingsLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-muted-foreground">Memuat data...</span>
          </div>
        </div>
      </AppShell>
    )
  }

  const canEdit = userData?.role === "admin" || userData?.role === "superadmin"

  const handleInputChange = (field: keyof typeof localSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) || 0 : e.target.value;
    setLocalSettings((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    
    setIsSaving(true);
    
    try {
      if (!localSettings.id) throw new Error("Settings ID not found");
      await cafeSettingsApi.update(localSettings.id, localSettings);
      await mutateSettings();
      toast.success('Pengaturan berhasil disimpan');
    } catch (error: any) {
      let errorMessage = 'Gagal menyimpan pengaturan';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      {/* Page Header */}
      <motion.div
        className="mb-6 pb-4 border-b border-border"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Pengaturan</h1>
            <p className="text-sm text-muted-foreground">Kelola konfigurasi toko Anda</p>
          </div>
        </div>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Store & Tax settings */}
        <div className="flex flex-col gap-5">
          <GeneralSettings
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
            canEdit={canEdit}
            handleInputChange={handleInputChange}
          />

          <TaxCalculationSettings
            localSettings={localSettings}
            canEdit={canEdit}
            handleInputChange={handleInputChange}
          />

          {/* Save Button */}
          {canEdit ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.15 }}
            >
              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                whileHover={!isSaving ? { scale: 1.01, y: -1 } : {}}
                whileTap={!isSaving ? { scale: 0.99 } : {}}
                transition={{ duration: 0.05 }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
              Mode kasir — hanya dapat melihat pengaturan
            </div>
          )}
        </div>

        {/* Right Column: Admin-only sections */}
        {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
          <div className="flex flex-col gap-5">
            <NotificationSettings
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
              setSettings={async (s: any) => {
                if (!localSettings.id) return;
                await cafeSettingsApi.update(localSettings.id, s);
                await mutateSettings();
              }}
              userId={user?.id}
              cafeId={cafeId}
            />

            <CashierManagement
              userId={user?.id}
              cafeId={cafeId}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}