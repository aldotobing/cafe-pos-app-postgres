"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useMemo, useState } from "react"
import { formatRupiah, formatTanggal } from "../../lib/format"
import { useAuth } from '@/lib/auth-context';
import { useTransactionsPaginated, useCafeSettings } from "@/hooks/use-cafe-data"
import { transactionsApi } from '@/lib/api'
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Receipt, TrendingUp, Calendar as CalendarIcon, FileText, ScrollText, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader2, BadgePercent, Ban } from 'lucide-react';
import { generateTransactionReport } from '@/lib/reports/transaction-report';
import { toast } from 'sonner';
import { TransactionsSkeleton } from '@/components/skeletons';
import { TransactionDetailModal } from '@/components/transactions/transaction-detail-modal';
import type { Transaction } from "../../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Button,
} from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Page() {
  // Set default dates to today
  const today = new Date().toISOString().split('T')[0];
  const [method, setMethod] = useState<string>("Semua")
  const [from, setFrom] = useState<string>(today)
  const [to, setTo] = useState<string>(today)
  const [userFilter, setUserFilter] = useState<string>("Semua")
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'voided'>('all')
  const [usersList, setUsersList] = useState<Array<{id: string, full_name: string}>>([])
  const [exporting, setExporting] = useState(false)

  const { userData, loading: authLoading, user } = useAuth();
  const cafeId = userData?.cafe_id;
  const { settings } = useCafeSettings(cafeId);
  const router = useRouter();

  // Proper Pagination with API total count
  const {
    transactions: paginatedTransactions,
    totalCount,
    totalAmount,
    completedTotal,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading,
    isValidating,
    mutate,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = useTransactionsPaginated(cafeId, 10, { from, to, created_by: userFilter, payment_method: method, status: statusFilter });

  // Combined loading state: initial load OR page switch
  const isFetching = isLoading || isValidating;

  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Revalidate on void
  useEffect(() => {
    const handler = () => mutate()
    window.addEventListener('transactionVoided', handler)
    return () => window.removeEventListener('transactionVoided', handler)
  }, [mutate])

  // Fetch users list for filter dropdown
  useEffect(() => {
    if (authLoading || !userData?.cafe_id) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/rest/users?cafe_id=${userData.cafe_id}`);
        if (response.ok) {
          const result = await response.json();
          // API returns { data: [...], meta: {...} }
          const users = result.data || (Array.isArray(result) ? result : []);
          setUsersList(users);
        }
      } catch (error) {
        // Silently fail - users list will remain empty
      }
    };

    fetchUsers();
  }, [authLoading, userData?.cafe_id]);

  // Animation variants
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };

  const filterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const summaryVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };



  useEffect(() => {
    // Check authentication - redirect if not logged in
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    // Check approval status for regular admin users
    if (!authLoading && user && userData) {
      if (!userData.is_approved && userData.role !== 'superadmin') {
        // Redirect to pending approval page
        router.push('/pending-approval');
        return;
      }

      // For cashier users, ensure they're assigned to a cafe
      if (userData.role === 'cashier' && !userData.cafe_id) {
        router.push('/login'); // Cashier not assigned to any cafe
        return;
      }

      // For admin users who don't have a cafe assigned, redirect to create cafe
      if (userData.role === 'admin' && !userData.cafe_id) {
        router.push('/create-cafe');
        return;
      }
    }
  }, [user, userData, authLoading, router]);

  // All filtering is server-side; status filter passed to API
  const filtered = paginatedTransactions

  const summaryStats = useMemo(() => ({
    count: totalCount,
    total: completedTotal, // Always completed-only
  }), [totalCount, completedTotal])

  // Table display total (from current page only, filtered by method/user)
  const pageTotal = filtered.reduce((sum, t) => sum + (t.totalAmount || 0), 0)

  // Pre-compute rows to avoid deep JSX nesting confusing the parser
  const desktopSkeletonRows = Array.from({ length: 5 }).map((_, i) => (
    <tr key={`skel-${i}`} className="border-b">
      <td className="px-4 py-3"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-14 bg-muted animate-pulse rounded-full" /></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></td>
      <td className="px-4 py-3"><div className="h-4 w-36 bg-muted animate-pulse rounded" /></td>
    </tr>
  ))

  const mobileSkeletonCards = Array.from({ length: 5 }).map((_, i) => (
    <div key={`skel-m-${i}`} className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
        <div className="h-5 w-20 bg-muted animate-pulse rounded" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  ))

  // Show full-page loading only for auth check, not for data fetching
  if (authLoading) {
    return <TransactionsSkeleton />;
  }

  const paymentMethodStyles: Record<string, string> = {
    Tunai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold',
    QRIS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-semibold',
    Debit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-semibold',
    Transfer: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 font-semibold',
  }

  const handleExport = async () => {
    if (summaryStats.count === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }
    setExporting(true);
    const loadingToast = toast.loading(`Menyiapkan ${summaryStats.count.toLocaleString('id-ID')} transaksi...`);
    try {
      const result = await transactionsApi.getPaginated(cafeId!, totalCount, 0, {
        from, to, created_by: userFilter, payment_method: method
      });
      toast.loading("Membuat laporan PDF...", { id: loadingToast });
      await generateTransactionReport({
        transactions: result.data,
        users: usersList,
        dateRange: { from: new Date(from), to: new Date(to) },
        settings: (settings as any) || {},
        filters: { method, user: userFilter }
      });
      toast.success(`Laporan ${result.data.length} transaksi berhasil diekspor.`, { id: loadingToast });
    } catch (e) {
      toast.error("Gagal mengekspor laporan.", { id: loadingToast });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      {/* Header Section */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-sm text-muted-foreground">Monitor data transaksi harian Anda.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border hover:bg-muted transition-all text-sm font-medium shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
          <span>{exporting ? 'Mengekspor...' : 'Export Laporan'}</span>
        </button>
      </motion.div>

      {/* Summary Section */}
      <motion.div
        className={`mb-6 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-card border shadow-sm ${isFetching ? 'opacity-70' : ''}`}
        variants={summaryVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                Total Pendapatan
              </div>
              <div className="text-xs text-muted-foreground">
                {isFetching ? (
                  <><Loader2 className="h-3 w-3 animate-spin inline mr-1" />Memuat...</>
                ) : (
                  <>{summaryStats.count} transaksi</>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            {isFetching ? (
              <div className="text-2xl sm:text-3xl font-bold text-muted-foreground/50">-</div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">{formatRupiah(summaryStats.total)}</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        className="mb-6 rounded-xl sm:rounded-2xl border bg-card shadow-sm p-4 sm:p-5"
        variants={filterVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Filter</span>
          {(userFilter !== 'Semua' || method !== 'Semua' || from !== today || to !== today || statusFilter !== 'all') && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </div>
        <div className="flex gap-2 mb-4">
          {(['all', 'completed', 'voided'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {s === 'all' ? 'Semua' : s === 'completed' ? 'Selesai' : 'Void'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Kasir</label>
            <select
              className="w-full h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option>Semua</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.full_name.split(' ')[0]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Metode</label>
            <select
              className="w-full h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option>Semua</option>
              <option>Tunai</option>
              <option>QRIS</option>
              <option>Debit</option>
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Periode</label>
            <div className="grid grid-cols-2 gap-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 rounded-xl justify-start font-normal text-sm">
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">{format(parseISO(from), 'dd MMM yyyy', { locale: id })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                  <Calendar mode="single" selected={parseISO(from)} onSelect={(date) => date && setFrom(format(date, 'yyyy-MM-dd'))} locale={id} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 rounded-xl justify-start font-normal text-sm">
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">{format(parseISO(to), 'dd MMM yyyy', { locale: id })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                  <Calendar mode="single" selected={parseISO(to)} onSelect={(date) => date && setTo(format(date, 'yyyy-MM-dd'))} locale={id} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-dashed">
          <button
            onClick={() => { setUserFilter("Semua"); setMethod("Semua"); setFrom(today); setTo(today); }}
            className="flex-1 sm:flex-none px-4 h-9 rounded-xl border border-dashed hover:bg-muted/50 transition-all text-xs font-medium text-muted-foreground"
          >
            Reset
          </button>
        </div>
      </motion.div>

      {/* Transactions - Page info bar */}
      <div className="mb-2 text-[11px] text-muted-foreground/70 flex items-center justify-between px-1">
        <span>{totalCount > 0 ? `${filtered.length}/${totalCount} transaksi · ${formatRupiah(pageTotal)}` : 'Tidak ada transaksi'}</span>
        {totalPages > 1 && <span>{currentPage}/{totalPages}</span>}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-hidden rounded-xl border bg-card shadow-sm relative">
        {filtered.length === 0 && !isFetching ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Receipt className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
            <h3 className="text-sm font-semibold mb-1">Tidak ada transaksi</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Coba ubah filter atau tambahkan transaksi baru.</p>
          </div>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[140px]">Waktu</th>
                <th className="px-4 py-3 text-center font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[64px]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[100px]">Kasir</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[90px]">Metode</th>
                <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[100px]">Total</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[30%]">Item</th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? desktopSkeletonRows : filtered.map((t, idx) => {
                const cashierName = t.cashier_name
                  ? t.cashier_name.split(' ')[0]
                  : usersList.find(u => String(u.id) === String(t.created_by))?.full_name?.split(' ')[0]
                  || (['local', 'system', 'unknown'].includes(t.created_by) ? '-' : (t.created_by ? `ID:${t.created_by.slice(0, 5)}` : '-'))

                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
                      t.status === 'voided' && 'bg-red-50/50 dark:bg-red-950/20'
                    )}
                    onClick={() => { setSelectedTransactionId(t.id); setShowDetailModal(true) }}
                  >
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold tabular-nums">
                          {(() => {
                            const d = new Date(t.createdAt)
                            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {(() => {
                              const d = new Date(t.createdAt)
                              return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          })()}
                          </div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono">{t.transaction_number || t.id?.slice(0, 10)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status === 'voided' && (
                        <div className="flex flex-col items-center gap-0.5" title={`Divoid · ${t.void_reason || 'Tanpa alasan'}`}>
                          <Ban className="h-4 w-4 text-destructive" />
                          <span className="text-[9px] text-destructive/70 leading-tight text-center max-w-[60px] truncate">{t.void_reason || '-'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{cashierName}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px]", paymentMethodStyles[t.paymentMethod] || 'bg-muted text-muted-foreground')}>
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      <div>{formatRupiah(t.totalAmount || 0)}</div>
                      {(t.discountType || t.discount_type) !== 'none' && (t.discountAmount || t.discount_amount) > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                          <BadgePercent className="h-3 w-3" />
                          Promo
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <a href={`/receipt/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-primary" title="Cetak Struk">
                            <Receipt className="h-4 w-4" />
                          </a>
                          <a href={`/invoice/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 dark:text-blue-400" title="Download Invoice">
                            <ScrollText className="h-4 w-4" />
                          </a>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs" title={t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}>
                            {t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{t.items.length} item</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 p-4 border-t bg-muted/20">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="w-8 h-8 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center" title="Pertama"><ChevronFirst className="h-3.5 w-3.5" /></button>
            <button onClick={goToPrevPage} disabled={!hasPrevPage} className="w-8 h-8 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center" title="Sebelumnya"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="text-xs text-muted-foreground px-2">{currentPage} / {totalPages}</span>
            <button onClick={goToNextPage} disabled={!hasNextPage} className="w-8 h-8 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center" title="Selanjutnya"><ChevronRight className="h-3.5 w-3.5" /></button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center" title="Terakhir"><ChevronLast className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border bg-card">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3 mx-auto" />
            <h3 className="text-sm font-semibold mb-1">Tidak ada transaksi</h3>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau tambahkan transaksi baru.</p>
          </div>
        ) : (
          isFetching ? mobileSkeletonCards : (
            <AnimatePresence mode="popLayout">
            {filtered.map((t) => {
              const cashierName = t.cashier_name
                ? t.cashier_name.split(' ')[0]
                : usersList.find(u => String(u.id) === String(t.created_by))?.full_name?.split(' ')[0]
                || (['local', 'system', 'unknown'].includes(t.created_by) ? '-' : (t.created_by ? `ID:${t.created_by.slice(0, 5)}` : '-'))

              const itemsText = t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="rounded-xl border bg-card shadow-sm overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
                  onClick={() => { setSelectedTransactionId(t.id); setShowDetailModal(true) }}
                >
                  <div className={cn("flex items-center justify-between p-3 border-b border-border/30", t.status === 'voided' ? 'bg-red-50/50 dark:bg-red-950/30' : 'bg-muted/20')}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatTanggal(t.createdAt)}</span>
                      {t.status === 'voided' && <Ban className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {(t.discountType || t.discount_type) !== 'none' && (t.discountAmount || t.discount_amount) > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <BadgePercent className="h-3 w-3" />
                          Promo
                        </div>
                      )}
                      <div className="font-bold text-sm tabular-nums">{formatRupiah(t.totalAmount || 0)}</div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Kasir: <span className="text-foreground font-medium">{cashierName}</span></span>
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", paymentMethodStyles[t.paymentMethod] || 'bg-muted')}>{t.paymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground truncate">{itemsText || `${t.items.length} item`}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{t.items.length} item</div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <a href={`/receipt/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-primary" title="Cetak Struk">
                          <Receipt className="h-4 w-4" />
                        </a>
                        <a href={`/invoice/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 dark:text-blue-400" title="Download Invoice">
                          <ScrollText className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
          )
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-3">
            <button onClick={goToPrevPage} disabled={!hasPrevPage} className="h-9 px-3 rounded-xl border bg-card text-sm disabled:opacity-30 font-medium">
              Sebelumnya
            </button>
            <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
            <button onClick={goToNextPage} disabled={!hasNextPage} className="h-9 px-3 rounded-xl border bg-card text-sm disabled:opacity-30 font-medium">
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransactionId && (
        <TransactionDetailModal
          transactionId={selectedTransactionId}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedTransactionId(null)
          }}
        />
      )}
    </AppShell>
  )
}