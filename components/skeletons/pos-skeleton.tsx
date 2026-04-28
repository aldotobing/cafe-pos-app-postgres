import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';

const skeletonVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

export function POSSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="flex h-[calc(100vh-4rem)] gap-4 p-1"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Menu grid skeleton */}
        <motion.div variants={itemVariants} className="flex-1 overflow-y-auto">
          {/* Category tabs skeleton */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-24 bg-muted rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>

          {/* Menu items grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <div className="h-24 w-full bg-muted/30 animate-pulse" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cart panel skeleton (desktop) */}
        <motion.div variants={itemVariants} className="hidden lg:flex w-80 flex-col rounded-xl border bg-card">
          <div className="p-4 border-b">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 bg-muted/50 rounded animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
