'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useConnectionHealth } from '@/hooks/use-connection-health';

const TOAST_IDS = {
  offline: 'conn-offline',
  slow: 'conn-slow',
  recovered: 'conn-recovered',
};

const toastBase: React.CSSProperties = {
  borderLeft: '3px solid',
  padding: '12px 16px',
  minWidth: '300px',
  maxWidth: '420px',
};

export function OfflineBanner() {
  const { isOffline, isSlow } = useConnectionHealth();
  const prevRef = useRef({ offline: false, slow: false });

  useEffect(() => {
    const prev = prevRef.current;

    // Offline — persistent error toast
    if (isOffline && !prev.offline) {
      toast.dismiss(TOAST_IDS.slow);
      toast.dismiss(TOAST_IDS.recovered);
      toast.error('Jaringan tidak tersedia', {
        id: TOAST_IDS.offline,
        duration: Infinity,
        icon: <WifiOff className="h-4 w-4" />,
        description: 'Data mungkin tidak tersimpan. Silakan periksa koneksi Anda.',
        style: {
          ...toastBase,
          borderLeftColor: 'rgb(239, 68, 68)', // red-500
        },
      });
    } else if (!isOffline && prev.offline) {
      toast.dismiss(TOAST_IDS.offline);
      toast.success('Koneksi kembali tersedia', {
        id: TOAST_IDS.recovered,
        duration: 3000,
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: 'Menyelaraskan data...',
      });
    }

    // Slow — warning-style toast (sonner has no toast.warning, use base toast with warn styling)
    if (isSlow && !prev.slow && !isOffline) {
      toast.dismiss(TOAST_IDS.recovered);
      toast('Koneksi kurang stabil', {
        id: TOAST_IDS.slow,
        duration: 5000,
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        description: 'Data mungkin tertunda. Mohon tunggu sejenak ya.',
        style: {
          ...toastBase,
          borderLeftColor: 'rgb(245, 158, 11)', // amber-500
          background: 'hsl(40 30% 96%)',         // warm amber bg
          color: 'hsl(30 70% 20%)',              // dark brown text
          border: '1px solid hsl(40 50% 85%)',
        },
        className: 'dark:!bg-amber-950 dark:!text-amber-100 dark:!border-amber-800',
      });
    } else if (!isSlow && prev.slow) {
      toast.dismiss(TOAST_IDS.slow);
    }

    prevRef.current = { offline: isOffline, slow: isSlow };
  }, [isOffline, isSlow]);

  return null;
}
