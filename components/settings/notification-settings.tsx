"use client"

import { useState } from "react"
import { Bell, BellOff, Info, FlaskConical, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { PushNotificationService } from "@/lib/push-notification-service"

interface NotificationSettingsProps {
  localSettings: any
  setLocalSettings: React.Dispatch<React.SetStateAction<any>>
  setSettings: (settings: any) => void
  userId: string | undefined
  cafeId: number | null
}

export function NotificationSettings({ localSettings, setLocalSettings, setSettings, userId, cafeId }: NotificationSettingsProps) {
  const [isPushEnabling, setIsPushEnabling] = useState(false)

  const handlePushToggle = async () => {
    if (!userId || !cafeId) return

    setIsPushEnabling(true)
    try {
      const currentStatus = await PushNotificationService.getSubscriptionStatus()

      if (localSettings.enablePushNotifications === true) {
        await PushNotificationService.unsubscribeUser()
        const updatedSettings = { ...localSettings, enablePushNotifications: false }
        setLocalSettings(updatedSettings)
        await setSettings(updatedSettings)
        toast.success('Notifikasi push dinonaktifkan')
      } else {
        if (currentStatus === 'unsupported') {
          toast.error('Browser Anda tidak mendukung notifikasi push')
          return
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          toast.error('VAPID Public Key belum dikonfigurasi. Hubungi pengembang.')
          setIsPushEnabling(false)
          return
        }

        const success = await PushNotificationService.subscribeUser(
          vapidPublicKey,
          userId,
          cafeId
        )

        if (success) {
          const updatedSettings = { ...localSettings, enablePushNotifications: true }
          setLocalSettings(updatedSettings)
          await setSettings(updatedSettings)
          toast.success('Notifikasi push berhasil diaktifkan')
        } else {
          toast.error('Gagal mengaktifkan notifikasi. Pastikan Anda memberikan izin.')
        }
      }
    } catch (error) {
      console.error('Push Toggle Error:', error)
      toast.error('Terjadi kesalahan saat mengatur notifikasi')
    } finally {
      setIsPushEnabling(false)
    }
  }

  const isEnabled = localSettings.enablePushNotifications === true

  return (
    <motion.div
      className="rounded-xl border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06, duration: 0.15, ease: "easeOut" }}
    >
      {/* Header with toggle */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground'}`}>
          {isEnabled ? (
            <Bell className="h-[18px] w-[18px]" />
          ) : (
            <BellOff className="h-[18px] w-[18px]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold leading-tight">Notifikasi Push</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-700/30">
              <FlaskConical className="h-3 w-3" />
              Eksperimental
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Terima notifikasi untuk transaksi baru</p>
        </div>
        <button
          onClick={handlePushToggle}
          disabled={isPushEnabling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0 ${
            isEnabled ? 'bg-primary' : 'bg-muted'
          } ${isPushEnabling ? 'opacity-70' : ''}`}
        >
          {isPushEnabling ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-white animate-spin" />
            </span>
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>

      {/* Info Body */}
      <div className="px-4 py-4">
        <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fitur ini masih dalam tahap pengembangan (eksperimental). Jika diaktifkan, perangkat ini akan menerima notifikasi setiap ada transaksi baru yang masuk. Hanya akun dengan peran <strong>Admin</strong> yang akan menerima notifikasi ini.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
