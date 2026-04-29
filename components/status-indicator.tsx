"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, CheckCircle2, Loader2 } from "lucide-react"

export type StatusType = 'online' | 'offline' | 'syncing' | 'success' | 'idle'

interface StatusIndicatorProps {
  status?: StatusType
  pulse?: boolean
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export function StatusIndicator({ 
  status = 'idle', 
  pulse = true,
  showIcon = false,
  size = 'md'
}: StatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Determine actual status
  let actualStatus = status
  if (status === 'idle') {
    actualStatus = isOnline ? 'online' : 'offline'
  }

  const getStatusConfig = () => {
    switch (actualStatus) {
      case 'offline':
        return {
          color: 'bg-red-500',
          shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
          icon: WifiOff,
          title: 'Tidak ada koneksi internet'
        }
      case 'syncing':
        return {
          color: 'bg-amber-500',
          shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
          icon: Loader2,
          title: 'Sinkronisasi data...'
        }
      case 'success':
        return {
          color: 'bg-emerald-500',
          shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          icon: CheckCircle2,
          title: 'Data tersinkronisasi'
        }
      case 'online':
      default:
        return {
          color: 'bg-emerald-500',
          shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]',
          icon: Wifi,
          title: 'Terhubung'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const shouldPulse = pulse && (actualStatus === 'syncing' || actualStatus === 'success')
  const shouldSpin = actualStatus === 'syncing'

  return (
    <div className="flex items-center gap-1.5" title={config.title}>
      {showIcon && (
        <Icon 
          className={`${iconSizes[size]} ${config.color.replace('bg-', 'text-')} ${shouldSpin ? 'animate-spin' : ''}`} 
        />
      )}
      <span 
        className={`${sizeClasses[size]} rounded-full ${config.color} ${config.shadow} ${
          shouldPulse ? 'animate-pulse' : ''
        } transition-all duration-300`}
      />
    </div>
  )
}

// Hook untuk status indicator dengan auto-detect
export function useStatusIndicator() {
  const [status, setStatus] = useState<StatusType>('idle')
  const [lastTransactionTime, setLastTransactionTime] = useState<number | null>(null)

  useEffect(() => {
    // Listen for transaction completed
    const handleTransactionCompleted = () => {
      setStatus('success')
      setLastTransactionTime(Date.now())
      
      // Reset to online after 5 seconds
      setTimeout(() => {
        setStatus(prev => prev === 'success' ? 'online' : prev)
      }, 5000)
    }

    // Listen for sync events
    const handleSyncStart = () => setStatus('syncing')
    const handleSyncEnd = () => setStatus('online')

    window.addEventListener('transactionCompleted', handleTransactionCompleted)
    window.addEventListener('syncStart', handleSyncStart)
    window.addEventListener('syncEnd', handleSyncEnd)

    return () => {
      window.removeEventListener('transactionCompleted', handleTransactionCompleted)
      window.removeEventListener('syncStart', handleSyncStart)
      window.removeEventListener('syncEnd', handleSyncEnd)
    }
  }, [])

  return { status, setStatus, lastTransactionTime }
}
