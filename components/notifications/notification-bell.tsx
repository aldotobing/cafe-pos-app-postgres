'use client'

import { useState, useEffect } from 'react'
import { Bell, Package, AlertTriangle, Clock, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface Notification {
  id: string
  type: 'low-stock' | 'out-of-stock' | 'trial-expiring'
  title: string
  description: string
  href?: string
  timestamp: string
}

export function NotificationBell({ notifications = [] }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        {/* Mobile backdrop overlay */}
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
          onTouchMove={(e) => e.stopPropagation()}
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

function MobileBackdrop({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)

    return () => {
      document.body.style.overflow = prev
      document.body.style.touchAction = ''
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

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const Icon = notification.type === 'trial-expiring' ? Clock
    : notification.type === 'out-of-stock' ? AlertTriangle
    : Package

  const iconColor = notification.type === 'trial-expiring' ? 'text-amber-500 bg-amber-500/10'
    : notification.type === 'out-of-stock' ? 'text-red-500 bg-red-500/10'
    : 'text-amber-500 bg-amber-500/10'

  const content = (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted/70">
      <div className={cn('w-9 h-9 sm:w-8 sm:h-8 rounded-md flex items-center justify-center shrink-0', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.description}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{notification.timestamp}</p>
      </div>
    </div>
  )

  if (notification.href) {
    return (
      <Link href={notification.href} onClick={onClick} className="block">
        {content}
      </Link>
    )
  }

  return content
}
