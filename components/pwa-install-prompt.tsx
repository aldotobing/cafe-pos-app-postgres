'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

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
        <div className="max-w-[440px] mx-auto pointer-events-auto bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-4 flex items-center gap-4 group">
          {/* Elegant Icon Box */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 transition-transform group-hover:scale-105 duration-300">
            <Smartphone className="text-primary w-6 h-6" />
          </div>

          {/* Content Middle */}
          <div className="flex-1 min-w-0">
            <h4 className="font-['Playfair_Display',serif] text-foreground text-base font-bold leading-tight">
              Pasang KasirKu
            </h4>
            <p className="text-muted-foreground text-[13px] font-light mt-0.5 opacity-80">
              Akses cepat dari layar utama Anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleInstallClick}
              className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-all transform active:scale-[0.95] whitespace-nowrap shadow-lg shadow-primary/10"
            >
              Pasang
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-muted-foreground/30 hover:text-muted-foreground/80 hover:bg-muted transition-all"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;