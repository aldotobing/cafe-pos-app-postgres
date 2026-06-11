'use client';

import { useEffect, useState, useRef } from 'react';

export interface ConnectionHealth {
  isOffline: boolean;
  isSlow: boolean;
  isRecovering: boolean;
}

export function useConnectionHealth(): ConnectionHealth {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isSlow, setIsSlow] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Use a ref so event handlers always read the latest offline state
  // without needing to re-attach listeners
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
      // Only show slow if we're not offline
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
  }, []); // only attach once — ref keeps handlers fresh

  return { isOffline, isSlow, isRecovering };
}
