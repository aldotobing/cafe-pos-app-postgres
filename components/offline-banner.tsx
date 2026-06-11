'use client';

import { WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useConnectionHealth } from '@/hooks/use-connection-health';

export function OfflineBanner() {
  const { isOffline, isSlow, isRecovering } = useConnectionHealth();

  if (!isOffline && !isSlow && !isRecovering) return null;

  const config = isOffline
    ? {
        bg: 'bg-red-600',
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Tidak ada koneksi internet — data mungkin tidak tersimpan',
      }
    : isRecovering
      ? {
          bg: 'bg-emerald-600',
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Koneksi pulih, memperbarui data...',
        }
      : {
          // isSlow
          bg: 'bg-amber-500',
          icon: <Clock className="w-4 h-4" />,
          text: 'Koneksi lambat — mohon tunggu, data sedang diproses',
        };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-white transition-all duration-300 ${config.bg}`}
    >
      {config.icon}
      {config.text}
    </div>
  );
}
