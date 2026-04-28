import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';

const skeletonVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

export function DashboardSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="space-y-4 md:space-y-8 p-1"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header skeleton */}
        <motion.div variants={itemVariants}>
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        </motion.div>

        {/* Stat cards skeleton */}
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={itemVariants}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-40 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </motion.div>

        {/* Charts and quick actions skeleton */}
        <motion.div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7" variants={itemVariants}>
          <div className="col-span-1 md:col-span-2 lg:col-span-4 rounded-xl border bg-card p-4 h-64">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="h-48 w-full bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-3 rounded-xl border bg-card p-4 h-64 space-y-3">
            <div className="h-5 w-28 bg-muted rounded animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </motion.div>

        {/* Recent transactions skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-28 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
