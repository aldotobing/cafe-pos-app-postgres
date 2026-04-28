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

export function CategoriesSkeleton() {
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
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-48 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-36 bg-muted rounded-lg animate-pulse" />
        </motion.div>

        {/* Categories list skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-muted/50 rounded-md animate-pulse" />
                  <div className="h-7 w-7 bg-muted/50 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
