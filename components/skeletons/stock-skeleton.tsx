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

export function StockSkeleton() {
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
              <div className="h-6 w-36 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
          </div>
        </motion.div>

        {/* Stats cards skeleton */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </motion.div>

        {/* Filter tabs skeleton */}
        <motion.div variants={itemVariants} className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-24 bg-muted rounded-md animate-pulse" />
          ))}
        </motion.div>

        {/* Table skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Item', 'Kategori', 'Stok', 'Min. Stok', 'HPP', 'Status', 'Aksi'].map((header) => (
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
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-8 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-6 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-5 w-16 bg-muted/30 rounded-md animate-pulse mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-6 w-20 bg-muted/30 rounded-md animate-pulse mx-auto" /></td>
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
