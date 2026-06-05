'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STORAGE_KEY = 'pwa-install-dismissed-at';
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasHandledRef = useRef(false);

  useEffect(() => {
    const checkDismissed = () => {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed < DISMISS_DURATION;
      }
      return false;
    };

    // Don't show if recently dismissed
    if (checkDismissed()) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-ignore
        navigator.standalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent multiple handlers from triggering
      if (hasHandledRef.current) return;
      hasHandledRef.current = true;

      e.preventDefault();
      setDeferredPrompt(e);
      
      // Clear any existing timeout
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }

      // Wait 3 seconds before showing
      showTimeoutRef.current = setTimeout(() => {
        // Check again if dismissed before showing
        if (checkDismissed()) {
          return;
        }
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      // Cleanup timeout on unmount
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
        setIsVisible(false);
        hasHandledRef.current = false; // Reset for potential reinstall
        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
      });
    }
  };

  const handleDismiss = () => {
    // Clear pending timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    
    // Store dismissal timestamp
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsVisible(false);
    hasHandledRef.current = false; // Allow future events to trigger
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-0 right-0 z-[100] px-4 md:px-0 pointer-events-none"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="max-w-sm mx-auto pointer-events-auto bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] py-2.5 pl-3 pr-2 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border border-border/50">
            <img src="/icon-192x192.png" alt="KasirKu" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-semibold leading-tight truncate">
              Pasang KasirKu
            </p>
            <p className="text-muted-foreground text-xs font-medium mt-0.5 opacity-70">
              Akses cepat dari layar utama Anda.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition-all active:scale-[0.95] whitespace-nowrap"
            >
              Pasang
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-muted transition-colors"
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;