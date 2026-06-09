'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Package, AlertTriangle, Clock, ShoppingCart, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type NotifType = 'low_stock' | 'out_of_stock' | 'trial_expiring' | 'new_transaction'

interface Notification {
  id: string
  cafe_id: number
  type: NotifType
  title: string
  body: string
  data: any
  is_read: boolean
  created_at: string
}

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; link: (d: any) => string }> = {
  new_transaction: {
    icon: ShoppingCart,
    color: 'text-blue-500 bg-blue-500/10',
    link: () => `/transactions`
  },
  low_stock: {
    icon: Package,
    color: 'text-amber-500 bg-amber-500/10',
    link: () => '/stock'
  },
  out_of_stock: {
    icon: AlertTriangle,
    color: 'text-red-500 bg-red-500/10',
    link: () => '/stock'
  },
  trial_expiring: {
    icon: Clock,
    color: 'text-orange-500 bg-orange-500/10',
    link: () => '/settings'
  }
}

export function NotificationBell({ cafeId }: { cafeId?: number | null }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!cafeId) return
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {}
  }, [cafeId])

  useEffect(() => {
    fetchNotifications()

    pollRef.current = setInterval(fetchNotifications, 15000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchNotifications])

  // Also poll on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchNotifications])

  const unread = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    if (!cafeId || unread === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    fetch('/api/notifications', { method: 'PATCH', credentials: 'include' }).catch(() => {})
  }

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        fetchNotifications()
        if (unread > 0) markAllRead()
      }
    }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`Notifikasi${unread > 0 ? ` (${unread})` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 p-0"
        align="end"
        sideOffset={8}
        collisionPadding={12}
      >
        {open && <MobileBackdrop onClose={() => setOpen(false)} />}

        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifikasi</span>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <span className="text-xs text-muted-foreground">{unread} baru</span>
            )}
            <button
              onClick={() => setOpen(false)}
              className="sm:hidden inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition-colors"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-20" />
              <span className="text-sm">Tidak ada notifikasi</span>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onClick={() => setOpen(false)} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const config = typeConfig[notification.type] || typeConfig.low_stock
  const Icon = config.icon
  const href = config.link(notification.data)

  const content = (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted/70">
      <div className={cn('w-9 h-9 sm:w-8 sm:h-8 rounded-md flex items-center justify-center shrink-0', config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-tight', !notification.is_read && 'font-medium')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {new Date(notification.created_at).toLocaleString('id-ID')}
        </p>
      </div>
    </div>
  )

  return (
    <Link href={href} onClick={onClick} className="block">
      {content}
    </Link>
  )
}

function MobileBackdrop({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[-1] sm:hidden"
      onClick={onClose}
      aria-hidden
    />
  )
}
