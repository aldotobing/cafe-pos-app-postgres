'use client';

import { useEffect, useState, useRef } from 'react';
import { getConnectionState } from '@/lib/fetch-client';

export interface ConnectionHealth {
  isOffline: boolean;
  isSlow: boolean;
  isRecovering: boolean;
}

export function useConnectionHealth(): ConnectionHealth {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Check initial slow state: fetch-client may have already detected slowness
  // via navigator.connection.effectiveType before React mounted
  const [isSlow, setIsSlow] = useState(() => {
    if (getConnectionState().state === 'slow') return true;
    // Also check directly in case the module init hasn't run yet
    if (typeof navigator !== 'undefined') {
      const conn = (navigator as any).connection;
      if (conn && ['slow-2g', '2g'].includes(conn.effectiveType)) {
        return true;
      }
    }
    return false;
  });

  const [isRecovering, setIsRecovering] = useState(false);

  const offlineRef = useRef(isOffline);
  offlineRef.current = isOffline;

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsSlow(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsRecovering(true);
      setTimeout(() => setIsRecovering(false), 2000);
    };

    const handleSlow = () => {
      if (!offlineRef.current) {
        setIsSlow(true);
      }
    };

    const handleRecovered = () => {
      setIsSlow(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('connection-slow', handleSlow);
    window.addEventListener('connection-recovered', handleRecovered);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('connection-slow', handleSlow);
      window.removeEventListener('connection-recovered', handleRecovered);
    };
  }, []);

  return { isOffline, isSlow, isRecovering };
}
