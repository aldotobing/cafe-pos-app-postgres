'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff, AlertTriangle } from 'lucide-react';

const PWARegister = () => {
  useEffect(() => {
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      const register = () => {
        console.log('[SW] Attempting to register...');
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('[SW] Registration failed:', error);
          });
      };

      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    } else {
      console.warn('[SW] Service workers are not supported in this browser');
    }

    // Listen for installation prompts
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
    });

    // Listen for messages from service worker (network errors)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ERROR') {
        const { errorType, message, url } = event.data;
        
        // Debounce: prevent multiple toasts for same error type
        const toastId = `sw-error-${errorType}`;
        
        if (errorType === 'API_ERROR') {
          toast.error(message, {
            id: toastId,
            icon: <WifiOff className="w-4 h-4" />,
            description: url ? `Endpoint: ${url}` : undefined,
            duration: 5000,
          });
        } else if (errorType === 'NAVIGATION_ERROR') {
          toast.warning(message, {
            id: toastId,
            icon: <AlertTriangle className="w-4 h-4" />,
            description: 'Mencoba memuat ulang halaman...',
            duration: 4000,
          });
        } else if (errorType === 'UPLOAD_ERROR') {
          toast.error(message, {
            id: toastId,
            icon: <AlertTriangle className="w-4 h-4" />,
            description: 'Periksa koneksi dan coba lagi',
            duration: 6000,
          });
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  return null;
};

export default PWARegister;