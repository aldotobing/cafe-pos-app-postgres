"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useMemo, useState } from "react"
import { formatRupiah, formatTanggal } from "../../lib/format"
import { useAuth } from '@/lib/auth-context';
import { useTransactionsPaginated, useCafeSettings } from "@/hooks/use-cafe-data"
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Receipt, TrendingUp, Calendar as CalendarIcon, FileText, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader2 } from 'lucide-react';
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
  const [usersList, setUsersList] = useState<Array<{id: string, full_name: string}>>([])

  const { userData, loading: authLoading, user } = useAuth();
  const cafeId = userData?.cafe_id;
  const { settings } = useCafeSettings(cafeId);
  const router = useRouter();

  // Proper Pagination with API total count
  const {
    transactions: paginatedTransactions,
    totalCount,
    totalAmount, // Total amount of ALL filtered transactions from API
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading,
    isValidating, // True when switching pages / re-fetching
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = useTransactionsPaginated(cafeId, 10, { from, to, created_by: userFilter, payment_method: method });

  // Combined loading state: initial load OR page switch
  const isFetching = isLoading || isValidating;

  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

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

  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
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

  // All filtering is now server-side; data is already sorted by API (created_at DESC)
  const filtered = paginatedTransactions

  // Summary stats - count and totalAmount from API (ALL filtered transactions)
  const summaryStats = useMemo(() => {
    return {
      count: totalCount, // Total count of ALL filtered transactions from API
      total: totalAmount // Total amount of ALL filtered transactions from API
    }
  }, [totalCount, totalAmount])

  // Table display total (from current page only, filtered by method/user)
  const pageTotal = filtered.reduce((sum, t) => sum + (t.totalAmount || 0), 0)

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
    try {
      await generateTransactionReport({
        transactions: filtered,
        users: usersList,
        dateRange: { from: new Date(from), to: new Date(to) },
        settings: (settings as any) || {},
        filters: { method, user: userFilter }
      });
      toast.success("Laporan berhasil diekspor.");
    } catch (e) {
      toast.error("Gagal mengekspor laporan.");
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border hover:bg-muted transition-all text-sm font-medium shadow-sm active:scale-95"
        >
          <FileText className="h-4 w-4 text-primary" />
          <span>Export Laporan</span>
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
          {(userFilter !== 'Semua' || method !== 'Semua' || from !== today || to !== today) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
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
      <motion.div
        className="hidden sm:block overflow-hidden rounded-xl border bg-card shadow-sm relative"
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
      >
        {isFetching && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Memuat data...</span>
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Receipt className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
            <h3 className="text-sm font-semibold mb-1">Tidak ada transaksi</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Coba ubah filter atau tambahkan transaksi baru.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[160px]">Waktu</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[120px]">Kasir</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[100px]">Metode</th>
                <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[110px]">Total</th>
                <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Item</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
              {filtered.map((t) => {
                const cashierName = t.cashier_name
                  ? t.cashier_name.split(' ')[0]
                  : usersList.find(u => String(u.id) === String(t.created_by))?.full_name?.split(' ')[0]
                  || (['local', 'system', 'unknown'].includes(t.created_by) ? '-' : (t.created_by ? `ID:${t.created_by.slice(0, 5)}` : '-'))

                return (
                  <motion.tr
                    key={t.id}
                    variants={rowVariants}
                    layout
                    className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedTransactionId(t.id); setShowDetailModal(true) }}
                  >
                    <td className="px-4 py-3 font-medium">{formatTanggal(t.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">{cashierName}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px]", paymentMethodStyles[t.paymentMethod] || 'bg-muted text-muted-foreground')}>
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatRupiah(t.totalAmount || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs" title={t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}>
                            {t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{t.items.length} item</div>
                        </div>
                        <a href={`/receipt/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary shrink-0" title="Lihat & cetak struk" onClick={(e) => e.stopPropagation()}>
                          <FileText className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              </AnimatePresence>
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
      </motion.div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border bg-card">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3 mx-auto" />
            <h3 className="text-sm font-semibold mb-1">Tidak ada transaksi</h3>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau tambahkan transaksi baru.</p>
          </div>
        ) : (
          <>
            {isFetching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
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
                  variants={rowVariants}
                  layout
                  className="rounded-xl border bg-card shadow-sm overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
                  onClick={() => { setSelectedTransactionId(t.id); setShowDetailModal(true) }}
                >
                  <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                    <div className="text-xs text-muted-foreground">{formatTanggal(t.createdAt)}</div>
                    <div className="font-bold text-sm tabular-nums">{formatRupiah(t.totalAmount || 0)}</div>
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
                      <a href={`/receipt/${t.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary shrink-0" onClick={(e) => e.stopPropagation()} title="Lihat & cetak struk">
                        <FileText className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
          </>
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