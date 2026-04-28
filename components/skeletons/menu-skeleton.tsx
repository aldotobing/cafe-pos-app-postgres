import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';

const skeletonVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

export function MenuSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="space-y-4"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header skeleton */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
        </motion.div>

        {/* Add item form skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-muted rounded-lg animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="p-4 space-y-5">
            {/* Form sections skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-36 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              </div>
              <div className="h-20 w-full bg-muted/30 rounded-lg animate-pulse" />
            </div>
            <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
          </div>
        </motion.div>

        {/* Menu items list skeleton */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <div className="h-32 w-full bg-muted/30 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-16 bg-muted/50 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
