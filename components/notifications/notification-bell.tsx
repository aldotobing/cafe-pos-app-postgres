'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Package, AlertTriangle, Clock, ShoppingCart, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import useSWR from 'swr'

type NotifType = 'low_stock' | 'out_of_stock' | 'trial_expiring' | 'new_transaction' | 'target_achieved'

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
  },
  target_achieved: {
    icon: ShoppingCart,
    color: 'text-emerald-500 bg-emerald-500/10',
    link: () => '/expenses'
  }
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json())

export function NotificationBell({ cafeId }: { cafeId?: number | null }) {
  const INITIAL_LIMIT = 5
  const [open, setOpen] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const prevLenRef = useRef(0)

  const { data, mutate } = useSWR<{ notifications: Notification[] }>(
    cafeId ? '/api/notifications' : null,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 10000,
    }
  )

  const notifications: Notification[] = data?.notifications ?? []

  useEffect(() => {
    if (notifications.length > prevLenRef.current && prevLenRef.current > 0) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 600)
      return () => clearTimeout(t)
    }
    prevLenRef.current = notifications.length
  }, [notifications.length])

  const unread = notifications.filter(n => !n.is_read && !readIds.has(n.id)).length

  const markAllRead = useCallback(async () => {
    if (!cafeId || unread === 0) return
    const ids = new Set(notifications.filter(n => !n.is_read).map(n => n.id))
    setReadIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    fetch('/api/notifications', { method: 'PATCH', credentials: 'include' }).catch(() => {})
  }, [cafeId, unread, notifications])

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        mutate()
        if (unread > 0) markAllRead()
      } else {
        setVisibleCount(INITIAL_LIMIT)
      }
    }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative inline-flex h-9 w-9 items-center justify-center rounded-md',
            'hover:bg-accent hover:text-accent-foreground',
            'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
            'active:scale-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            shaking && 'animate-shake'
          )}
          aria-label={`Notifikasi${unread > 0 ? ` (${unread})` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-sm"
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 p-0 overflow-hidden rounded-xl bg-card border border-border shadow-xl shadow-black/10 dark:shadow-black/40"
        align="end"
        sideOffset={8}
        collisionPadding={12}
      >
        {open && <MobileBackdrop onClose={() => setOpen(false)} />}

        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifikasi</span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs text-muted-foreground"
                >
                  {unread} baru
                </motion.span>
              )}
            </AnimatePresence>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground"
            >
              <Bell className="h-10 w-10 mb-3 opacity-20" />
              <span className="text-sm">Tidak ada notifikasi</span>
            </motion.div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {notifications.slice(0, visibleCount).map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, INITIAL_LIMIT - 1) * 0.04, duration: 0.2 }}
                  >
                    <NotificationItem notification={n} onClick={() => setOpen(false)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {visibleCount < notifications.length && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setVisibleCount(prev => Math.min(prev + INITIAL_LIMIT, notifications.length))}
                  className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t"
                >
                  Lihat lainnya ({notifications.length - visibleCount})
                </motion.button>
              )}
            </>
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
    <div className={cn(
      'flex items-start gap-3 px-4 py-3.5 border-b border-border/30 last:border-b-0 hover:bg-accent transition-colors cursor-pointer active:bg-accent/80',
      !notification.is_read && 'bg-primary/5 hover:bg-primary/8 border-l-2 border-l-primary'
    )}>
      <div className={cn('w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
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
      className="fixed inset-0 z-[-1] sm:hidden bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden
    />
  )
}
