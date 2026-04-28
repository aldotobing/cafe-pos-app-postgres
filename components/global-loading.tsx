'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Global loading context for the entire app
export default function GlobalLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Create a loading state listener to handle navigation loading
    let timeout: NodeJS.Timeout;
    
    // Show loading indicator immediately when route changes
    setIsLoading(true);
    
    // Hide loading indicator after a delay to ensure smooth transition
    timeout = setTimeout(() => {
      setIsLoading(false);
    }, 300); // 300ms delay to ensure smooth transition

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.02 }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.4, 
            ease: "linear" 
          }}
        />
        <motion.p
          className="mt-4 text-sm text-muted-foreground font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02 }}
        >
          Memuat aplikasi...
        </motion.p>
        <motion.div
          className="mt-2 h-1 w-32 bg-muted rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.03 }}
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 0.4,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}