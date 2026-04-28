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

export function TransactionsSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="space-y-4"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header skeleton */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-36 bg-muted rounded-lg animate-pulse" />
        </motion.div>

        {/* Summary card skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/50 rounded animate-pulse ml-auto" />
            </div>
          </div>
        </motion.div>

        {/* Filter section skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Table skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  {['Waktu', 'Kasir', 'Metode', 'Total', 'Item', 'Status'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-muted/30 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-4 bg-muted/30 rounded animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
