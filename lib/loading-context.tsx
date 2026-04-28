'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

type LoadingContextType = {
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;
  showContentLoading: (message?: string) => void;
  hideContentLoading: () => void;
  isGlobalLoading: boolean;
  isContentLoading: boolean;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('Memuat aplikasi...');
  const [contentLoadingMessage, setContentLoadingMessage] = useState('Memuat konten...');
  const pathname = usePathname();

  const showGlobalLoading = (message: string = 'Memuat aplikasi...') => {
    setGlobalLoadingMessage(message);
    setIsGlobalLoading(true);
  };

  const hideGlobalLoading = () => {
    setIsGlobalLoading(false);
  };

  const showContentLoading = (message: string = 'Memuat konten...') => {
    setContentLoadingMessage(message);
    setIsContentLoading(true);
  };

  const hideContentLoading = () => {
    setIsContentLoading(false);
  };

  // Disable content loading on route changes to prevent dizziness
  // Show content loading when route changes, then hide after a short delay
  // useEffect(() => {
  //   if (pathname) {
  //     showContentLoading();
  //     const timer = setTimeout(() => {
  //       hideContentLoading();
  //     }, 500); // Show for at least 500ms to ensure smooth transition

  //     return () => clearTimeout(timer);
  //   }
  // }, [pathname]);

  return (
    <LoadingContext.Provider value={{ 
      showGlobalLoading, 
      hideGlobalLoading, 
      showContentLoading, 
      hideContentLoading,
      isGlobalLoading,
      isContentLoading
    }}>
      {children}
      
      {/* Global Loading Overlay - for major operations */}
      <AnimatePresence>
        {isGlobalLoading && (
          <motion.div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center">
              <motion.div
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1, 
                  ease: "linear" 
                }}
              />
              <motion.p
                className="mt-4 text-sm text-muted-foreground font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {globalLoadingMessage}
              </motion.p>
              <motion.div
                className="mt-2 h-1 w-32 bg-muted rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content Loading Overlay - for page transitions */}
      {/* Commented out to prevent dizziness - was causing "memuat konten" blur */}
      {/* <AnimatePresence>
        {isContentLoading && (
          <motion.div 
            className="fixed inset-0 z-[99] flex items-center justify-center bg-white/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
          >
            <div className="flex flex-col items-center">
              <motion.div
                className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.8, 
                  ease: "linear" 
                }}
              />
              <motion.p
                className="mt-3 text-xs text-muted-foreground font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                {contentLoadingMessage}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}