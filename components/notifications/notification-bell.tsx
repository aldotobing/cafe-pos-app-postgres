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

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; bg: string; link: (d: any) => string }> = {
  new_transaction: {
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-500/15',
    link: () => `/transactions`
  },
  low_stock: {
    icon: Package,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    link: () => '/stock'
  },
  out_of_stock: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-500/15',
    link: () => '/stock'
  },
  trial_expiring: {
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-500/15',
    link: () => '/settings'
  },
  target_achieved: {
    icon: ShoppingCart,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    link: () => '/expenses'
  }
}

const PAGE_SIZE = 10

// Module-level cache of read notification IDs so the badge doesn't blink
// when the component remounts during page navigation
const READ_CACHE = new Set<string>()

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json())

export function NotificationBell({ cafeId }: { cafeId?: number | null }) {
  const [open, setOpen] = useState(false)
  const [shaking, setShaking] = useState(false)
  const prevLenRef = useRef(0)
  const patchingRef = useRef(false)

  const { data, mutate } = useSWR<{ notifications: Notification[]; total: number; hasMore: boolean }>(
    cafeId ? `/api/notifications?limit=${PAGE_SIZE}&offset=0` : null,
    fetcher,
    {
      refreshInterval: 0, // no polling — badge updates on focus or when bell is opened
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 30000,
    }
  )

  // Refresh badge after new transaction (dispatched by cart checkout)
  useEffect(() => {
    const handler = () => mutate()
    window.addEventListener('transactionCompleted', handler)
    return () => window.removeEventListener('transactionCompleted', handler)
  }, [mutate])

  // Fetch older notifications on demand
  const [olderData, setOlderData] = useState<Notification[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // Merge fetched notifications from SWR with older batch
  useEffect(() => {
    if (data) {
      setTotal(data.total)
      setHasMore(data.hasMore)
    }
  }, [data])

  const notifications: Notification[] = [
    ...((data?.notifications) ?? []),
    ...olderData,
  ]

  const loadMore = useCallback(async () => {
    if (!cafeId || loadingMore) return
    setLoadingMore(true)
    try {
      const nextOffset = ((data?.notifications?.length) ?? 0) + olderData.length
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${nextOffset}`, { credentials: 'include' })
      const json = await res.json()
      if (json.notifications?.length) {
        setOlderData(prev => [...prev, ...json.notifications])
      }
      setHasMore(json.hasMore ?? false)
    } catch {} finally {
      setLoadingMore(false)
    }
  }, [cafeId, loadingMore, data?.notifications?.length, olderData.length])

  // Only count unread from SWR data (latest), not older batches
  const latestNotifications = data?.notifications ?? []
  const unread = latestNotifications.filter(n => !n.is_read && !READ_CACHE.has(n.id)).length

  // Persist unread count across remounts to prevent badge blink during navigation.
  // When data is undefined (SWR still loading), reuse the last known count
  // instead of flashing 0.
  const lastUnreadRef = useRef(0)
  const displayedUnread = data ? unread : lastUnreadRef.current
  useEffect(() => {
    if (data) lastUnreadRef.current = unread
  }, [unread, data])

  useEffect(() => {
    if (latestNotifications.length > prevLenRef.current && prevLenRef.current > 0) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 600)
      return () => clearTimeout(t)
    }
    prevLenRef.current = latestNotifications.length
  }, [latestNotifications.length])

  const markAllRead = useCallback(async () => {
    if (!cafeId || unread === 0 || patchingRef.current) return
    patchingRef.current = true
    // Optimistically mark as read in the module-level cache so badge updates instantly
    // and survives remounts during navigation
    latestNotifications.filter(n => !n.is_read).forEach(n => READ_CACHE.add(n.id))
    try {
      // Await the PATCH, then mutate so SWR re-fetches confirmed server state
      await fetch('/api/notifications', { method: 'PATCH', credentials: 'include' })
      await mutate()
    } catch {
      // If PATCH fails, remove from cache so they show as unread again
      latestNotifications.filter(n => !n.is_read).forEach(n => READ_CACHE.delete(n.id))
    } finally {
      patchingRef.current = false
    }
  }, [cafeId, unread, latestNotifications, mutate])

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        if (unread > 0) {
          markAllRead() // mutates SWR after PATCH completes
        } else {
          mutate() // refresh list even if nothing to mark
        }
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
          aria-label={`Notifikasi${displayedUnread > 0 ? ` (${displayedUnread})` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          <AnimatePresence>
            {displayedUnread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-sm"
              >
                {displayedUnread > 9 ? '9+' : displayedUnread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 p-0 overflow-hidden rounded-xl bg-card border border-border shadow-lg shadow-black/15 dark:shadow-xl dark:shadow-black/40"
        align="end"
        sideOffset={8}
        collisionPadding={12}
      >
        {open && <MobileBackdrop onClose={() => setOpen(false)} />}

        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifikasi</span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {displayedUnread > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs text-muted-foreground"
                >
                  {displayedUnread} baru
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
                {notifications.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, PAGE_SIZE - 1) * 0.04, duration: 0.2 }}
                  >
                    <NotificationItem notification={n} onClick={() => setOpen(false)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {hasMore && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-t border-border/50 disabled:opacity-50"
                >
                  {loadingMore ? 'Memuat...' : `Lihat lainnya (${total - notifications.length})`}
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
      'flex items-start gap-3 px-4 py-3.5 border-b border-border/50 dark:border-border/30 last:border-b-0 hover:bg-accent transition-colors cursor-pointer active:bg-accent/80',
      !notification.is_read && 'bg-primary/10 dark:bg-primary/5 hover:bg-primary/15 dark:hover:bg-primary/8 border-l-2 border-l-primary'
    )}>
      <div className={cn('w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0', config.color, config.bg)}>
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
