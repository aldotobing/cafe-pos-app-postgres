import { AppShell } from '@/components/app-shell'

export function ExpenseSkeleton() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />
        </div>

        {/* Summary card */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="h-4 w-36 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-3 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-6 w-28 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="h-4 w-40 bg-muted rounded animate-pulse mb-2" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="flex-1 h-3 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/30 px-4 py-3 grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-3 bg-muted rounded animate-pulse" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border-b border-border/50 px-4 py-3.5 grid grid-cols-6 gap-4 items-center">
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
