"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useMemo, useState } from "react"
import { formatRupiah, formatTanggal } from "../../lib/format"
import { useAuth } from '@/lib/auth-context';
import { useTransactionsPaginated, useCafeSettings } from "@/hooks/use-cafe-data"
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, WifiOff, Upload, Filter, Receipt, TrendingUp, Calendar, FileText, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { generateTransactionReport } from '@/lib/reports/transaction-report';
import { toast } from 'sonner';
import { TransactionsSkeleton } from '@/components/skeletons';
import { TransactionDetailModal } from '@/components/transactions/transaction-detail-modal';
import type { Transaction } from "../../types";

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
    isLoading: transactionsLoading,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = useTransactionsPaginated(cafeId, 10, { from, to });

  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Fetch users list for filter dropdown
  useEffect(() => {
    if (authLoading || !userData?.cafe_id) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/rest/users?cafe_id=${userData.cafe_id}`);
        if (response.ok) {
          const users = await response.json();
          setUsersList(Array.isArray(users) ? users : []);
        }
      } catch (error) {
        // Silently fail - users list will remain empty
      }
    };

    fetchUsers();
  }, [authLoading, userData?.cafe_id]);

  // Animation variants
  const loadingVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
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

  // Filter transactions for table display (method & user filter only, date already handled by API)
  const filtered = useMemo(() => {
    let result = paginatedTransactions.filter((t) => {
      const okMethod = method === "Semua" ? true : t.paymentMethod === method
      const okUser = userFilter === "Semua" ? true : t.created_by === userFilter
      return okMethod && okUser
    })

    // Sort by date descending (latest first)
    result.sort((a, b) => {
      const dateA = typeof a.createdAt === 'number' ? new Date(a.createdAt) : new Date(a.createdAt);
      const dateB = typeof b.createdAt === 'number' ? new Date(b.createdAt) : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return result;
  }, [paginatedTransactions, method, userFilter])

  // Summary stats - count and totalAmount from API (ALL filtered transactions)
  const summaryStats = useMemo(() => {
    return {
      count: totalCount, // Total count of ALL filtered transactions from API
      total: totalAmount // Total amount of ALL filtered transactions from API
    }
  }, [totalCount, totalAmount])

  // Table display total (from current page only, filtered by method/user)
  const pageTotal = filtered.reduce((sum, t) => sum + (t.totalAmount || 0), 0)

  // Show loading state while checking auth
  if (authLoading || transactionsLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <AppShell>
      {/* Header Section */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Riwayat Transaksi</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitor data transaksi harian Anda.
            </p>
          </div>
        </div>
        {/* Desktop Export Button */}
        <div className="hidden sm:flex items-center">
          <button
            onClick={async () => {
              if (summaryStats.count === 0) {
                toast.error("Tidak ada data untuk diekspor.");
                return;
              }
              // Export currently visible transactions
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
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition-all text-sm font-medium shadow-sm active:scale-95"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>Export Laporan</span>
          </button>
        </div>
      </motion.div>

      {/* Summary Section */}
      <motion.div
        className="mb-6 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-card border shadow-sm relative overflow-hidden"
        variants={summaryVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Total Pendapatan</span>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                {summaryStats.count} transaksi
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            {/* Total amount of ALL filtered transactions */}
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">{formatRupiah(summaryStats.total)}</div>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-[0.02] pointer-events-none">
          <TrendingUp className="h-20 w-20" />
        </div>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        className="mb-6 rounded-xl sm:rounded-2xl border bg-card p-4 sm:p-5 shadow-sm"
        variants={filterVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Filter Data</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Kasir</label>
            <select
              className="w-full h-11 rounded-xl border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
              className="w-full h-11 rounded-xl border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
            <div className="grid grid-cols-2 gap-x-5">
              <input
                type="date"
                className="w-full h-11 rounded-xl border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className="w-full h-11 rounded-xl border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-dashed flex justify-end">
          <button
            onClick={() => {
              setUserFilter("Semua");
              setMethod("Semua");
              setFrom(today);
              setTo(today);
            }}
            className="w-full sm:w-auto px-8 h-10 rounded-xl border border-dashed hover:bg-muted/50 transition-all text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2"
          >
            <span>Reset Filter</span>
          </button>
        </div>
      </motion.div>

      {/* Mobile Export Button - Moved above the table */}
      <div className="mb-6 sm:hidden">
        <button
          onClick={async () => {
            if (summaryStats.count === 0) {
              toast.error("Tidak ada data untuk diekspor.");
              return;
            }
            // Export currently visible transactions
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
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted transition-all text-sm font-bold shadow-sm active:scale-95"
        >
          <FileText className="h-4 w-4 text-primary" />
          <span>Export Laporan</span>
        </button>
      </div>

      {/* Transactions Table */}
      {totalCount > 0 && (
        <div className="mb-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>Menampilkan {filtered.length} dari {totalCount} transaksi (Total halaman: {formatRupiah(pageTotal)})</span>
          <span>Halaman {currentPage} dari {totalPages}</span>
        </div>
      )}
      <motion.div
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Receipt className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground mb-1 text-center">Tidak ada transaksi</h3>
              <p className="text-xs text-muted-foreground text-center max-w-sm mx-auto">
                Tidak ada transaksi dengan filter saat ini. Coba ubah filter atau tambahkan transaksi baru.
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground min-w-[120px]">
                    Waktu
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground min-w-[100px]">
                    Kasir
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground min-w-[90px]">
                    Metode
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground min-w-[100px]">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Item
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((t, index) => (
                    <motion.tr
                      key={`${t.id || `tx-${index}`}`}
                      className="border-b last:border-b-0 cursor-pointer transition-colors"
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        delay: index * 0.03,
                        duration: 0.15,
                        ease: "easeOut"
                      }}
                      whileHover={{
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                      }}
                      onClick={() => {
                        setSelectedTransactionId(t.id)
                        setShowDetailModal(true)
                      }}
                      title="Klik untuk melihat detail transaksi"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{formatTanggal(t.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                           {(() => {
                             // 1. High priority: use persisted name if available
                             if (t.cashier_name) return t.cashier_name.split(' ')[0];

                             // 2. Fallback: look up in usersList
                             const invalidValues = ['local', 'system', 'unknown', null, undefined, ''];
                             if (invalidValues.includes(t.created_by)) return '-';
                             
                             const creator = usersList.find(u => String(u.id) === String(t.created_by));
                             if (creator) return creator.full_name.split(' ')[0];
                             
                             // 3. Last resort: partial ID
                             return t.created_by ? `ID:${t.created_by.slice(0, 5)}` : '-';
                           })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{formatRupiah(t.totalAmount || 0)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs" title={t.items.map((i) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}>
                              {t.items.map((i, idx) => `${i.name || i.menu_name || i.menuName} x${i.qty || i.quantity}`).join(", ")}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {t.items.length} item
                            </div>
                          </div>
                          <a
                            href={`/receipt/${t.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary inline-flex shrink-0"
                            title="Lihat & cetak struk"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={goToPrevPage}
                disabled={!hasPrevPage || transactionsLoading}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              
              <div className="flex items-center gap-1">
                {(() => {
                  // Calculate page range to show (max 5 pages)
                  let startPage = 1;
                  let endPage = Math.min(5, totalPages);
                  
                  if (totalPages > 5 && currentPage > 3) {
                    startPage = Math.min(currentPage - 2, totalPages - 4);
                    endPage = Math.min(startPage + 4, totalPages);
                  }
                  
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  
                  return pages.map((pageNum) => (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => goToPage(pageNum)}
                      disabled={transactionsLoading}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted disabled:opacity-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={!hasNextPage || transactionsLoading}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {transactionsLoading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Memuat data...</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

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