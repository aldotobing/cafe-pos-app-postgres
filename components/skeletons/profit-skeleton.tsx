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

export function ProfitSkeleton() {
  return (
    <AppShell>
      <motion.div
        className="space-y-6 p-1"
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header skeleton */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-3 w-40 bg-muted/50 rounded animate-pulse" />
          </div>
        </motion.div>

        {/* Controls skeleton (tabs + actions) */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg w-fit">
            <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-muted/50 rounded-md animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded-lg animate-pulse" />
          </div>
        </motion.div>

        {/* Summary cards skeleton */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-7 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </motion.div>

        {/* Charts section skeleton */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 h-64">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="h-48 w-full bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="rounded-xl border bg-card p-4 h-64">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="h-48 w-full bg-muted/50 rounded animate-pulse" />
          </div>
        </motion.div>

        {/* Table skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <div className="h-5 w-28 bg-muted rounded animate-pulse" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Item', 'Terjual', 'Harga Jual', 'HPP', 'Pendapatan', 'Laba', 'Margin', 'Trend'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      <div className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-t last:border-b-0">
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-8 bg-muted/30 rounded animate-pulse mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-24 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-24 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-12 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-16 bg-muted/30 rounded animate-pulse mx-auto" /></td>
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
