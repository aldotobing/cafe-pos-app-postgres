import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';

const skeletonVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25 },
  },
};

const Pulse = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded animate-pulse ${className || ''}`} />
);

// Full page skeleton (header + filters + content)
export function StatistikSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="space-y-6 pb-16"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header + date picker */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Pulse className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Pulse className="h-6 w-36" />
              <Pulse className="h-3 w-52 bg-muted/50" />
            </div>
          </div>
          <Pulse className="h-10 w-64 rounded-lg" />
        </motion.div>

        {/* Stat cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Pulse className="h-8 w-8 rounded-lg" />
                <Pulse className="h-3 w-20" />
              </div>
              <Pulse className="h-7 w-28" />
              <Pulse className="h-3 w-16 bg-muted/50" />
            </div>
          ))}
        </motion.div>

        {/* Revenue chart */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 h-80">
          <Pulse className="h-5 w-36 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </motion.div>

        {/* Category chart + Top items side by side */}
        <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-32 mb-4" />
            <div className="h-52 w-full bg-muted/30 rounded-lg" />
          </div>
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-28 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Pulse className="h-4 w-36 bg-muted/30" />
                  <Pulse className="h-4 w-16 bg-muted/30" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Hourly + Day of Week */}
        <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-40 mb-4" />
            <div className="h-52 w-full bg-muted/30 rounded-lg" />
          </div>
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-40 mb-4" />
            <div className="h-52 w-full bg-muted/30 rounded-lg" />
          </div>
        </motion.div>

        {/* Cashier + Peak hours */}
        <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-44 mb-4" />
            <div className="h-52 w-full bg-muted/30 rounded-lg" />
          </div>
          <div className="rounded-xl border bg-card p-5 h-72">
            <Pulse className="h-5 w-44 mb-4" />
            <div className="h-52 w-full bg-muted/30 rounded-lg" />
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}

// Data-only skeleton — keeps header/filters visible, skeletonizes content area
export function DataSkeleton() {
  return (
    <motion.div
      variants={skeletonVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 sm:space-y-12"
    >
      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Pulse className="h-8 w-8 rounded-lg" />
              <Pulse className="h-3 w-24" />
            </div>
            <Pulse className="h-8 w-32" />
            <Pulse className="h-3 w-20 bg-muted/50" />
          </div>
        ))}
      </motion.div>

      {/* Revenue chart */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 h-80">
        <Pulse className="h-5 w-36 mb-4" />
        <div className="h-60 w-full bg-muted/30 rounded-lg" />
      </motion.div>

      {/* Category + Top items */}
      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-32 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-28 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <Pulse className="h-4 w-40 bg-muted/30" />
              <Pulse className="h-4 w-16 bg-muted/30" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hourly + Day of week */}
      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-40 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-40 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </div>
      </motion.div>

      {/* Cashier + Peak hours */}
      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-44 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5 h-72">
          <Pulse className="h-5 w-44 mb-4" />
          <div className="h-56 w-full bg-muted/30 rounded-lg" />
        </div>
      </motion.div>
    </motion.div>
  );
}
