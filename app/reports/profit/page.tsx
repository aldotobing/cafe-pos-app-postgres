"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState, useMemo } from "react"
import { useMenu } from "@/hooks/use-cafe-data"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, DollarSign, Package, BarChart3, ArrowUpRight, Calendar as CalendarIcon, RefreshCw, Info, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react'
import { formatRupiah } from "@/lib/format"
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { generateFinancialReport } from '@/lib/reports/financial-report';
import { toast } from "sonner"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProfitSkeleton } from '@/components/skeletons';
import { InfoModal } from '@/components/profit/info-modal';
import { profitInfo } from '@/lib/profit-info';
import useSWR from 'swr';
import { Loader2 } from 'lucide-react';
import { swrConfigForTransactions } from '@/lib/swr-config';

interface ProfitData {
  menuId: string
  menuName: string
  category: string
  hppPrice: number
  sellingPrice: number
  totalQtySold: number
  totalRevenue: number
  totalCOGS: number
  totalProfit: number
  profitMargin: number
}


export default function ProfitReportPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const cafeId = userData?.cafe_id;
  const { menu, isLoading: menuLoading } = useMenu(cafeId);
  const router = useRouter();

  const [tooltipId, setTooltipId] = useState<string | null>(null)
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: new Date(),
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Format dates for API query - memoized to prevent unnecessary recalculations
  const dateParams = useMemo(() => {
    const startDateStr = format(date?.from || new Date(), 'yyyy-MM-dd');
    const endDateStr = format(addDays(date?.to || date?.from || new Date(), 1), 'yyyy-MM-dd');
    return { startDateStr, endDateStr };
  }, [date]);

  // Use SWR for fetching and caching
  // NOTE: Use large limit (1000) to fetch all transactions for profit calculation
  // while still protecting DB from unbounded queries
  const { data: txs, error, isLoading: isFetching, isValidating, mutate } = useSWR(
    !authLoading && userData?.cafe_id
      ? `/api/rest/transactions?cafe_id=${userData.cafe_id}&created_at_gte=${dateParams.startDateStr}&created_at_lt=${dateParams.endDateStr}&limit=1000`
      : null,
    null, // Use global fetcher
    swrConfigForTransactions
  );

  // Extract and map data from API response format { data: [], meta: {} }
  const transactions = useMemo(() => {
    const raw = txs?.data || (Array.isArray(txs) ? txs : []);
    
    // Map snake_case to camelCase for consistency
    return raw.map((tx: any) => ({
      ...tx,
      transactionNumber: tx.transaction_number || tx.id,
      taxAmount: tx.tax_amount || 0,
      serviceCharge: tx.service_charge || 0,
      totalAmount: tx.total_amount || 0,
      paymentMethod: tx.payment_method || 'Tunai',
      paymentAmount: tx.payment_amount || 0,
      changeAmount: tx.change_amount || 0,
      orderNote: tx.order_note || '',
      items: (tx.transaction_items || tx.items || []).map((item: any) => ({
        id: item.id || '',
        transactionId: item.transaction_id || item.transactionId || '',
        menuId: item.menu_id || item.menuId || '',
        name: item.menu_name || item.menuName || item.name || '',
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 0),
        discount: typeof item.discount === 'number' ? item.discount : 0,
        note: item.note,
        lineTotal: ((item.price || 0) * (item.quantity || item.qty || 0)) - (item.discount || 0),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      })),
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));
  }, [txs]);

  // Animation variants
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };

  const filterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  // Close tooltip on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipId) {
        const target = e.target as HTMLElement;
        if (!target.closest('.margin-tooltip')) {
          setTooltipId(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tooltipId]);

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [date, transactions]);

  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }
  }, [user, userData, authLoading, router]);

  // Compute profit data from fetched transactions and local menu state
  const profitData = useMemo(() => {
    console.log('[DEBUG] profitData calculation:', {
      transactionsCount: transactions?.length || 0,
      menuCount: menu?.length || 0,
      firstTransaction: transactions?.[0],
    });

    if (!transactions || !menu.length) return [];

    // Aggregate sales
    const salesMap: Record<string, { qty: number, revenue: number }> = {};
    transactions.forEach((tx: any) => {
      if (!tx.items) {
        console.log('[DEBUG] Transaction has no items:', tx.id);
        return;
      }
      tx.items.forEach((item: any) => {
        const menuId = (item.menuId || item.menu_id)?.toString();
        if (!menuId) {
          console.log('[DEBUG] Item has no menuId:', item);
          return;
        }

        if (!salesMap[menuId]) {
          salesMap[menuId] = { qty: 0, revenue: 0 };
        }

        const qty = Number(item.qty || item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0;
        const lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) : (price * qty - discount);

        salesMap[menuId].qty += qty;
        salesMap[menuId].revenue += lineTotal;
      });
    });

    console.log('[DEBUG] salesMap:', salesMap);

    const result = menu.map(m => {
      const sale = salesMap[m.id] || { qty: 0, revenue: 0 };
      const hppPrice = m.hppPrice ?? 0;
      const cogs = hppPrice * sale.qty;
      const profit = sale.revenue - cogs;
      const margin = sale.revenue > 0 ? (profit / sale.revenue) * 100 : 0;
      return {
        menuId: m.id,
        menuName: m.name,
        category: m.category || 'Unknown',
        hppPrice: hppPrice,
        sellingPrice: m.price,
        totalQtySold: sale.qty,
        totalRevenue: sale.revenue,
        totalCOGS: cogs,
        totalProfit: profit,
        profitMargin: margin
      };
    }).filter(item => item.totalQtySold > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Default sort by revenue

    console.log('[DEBUG] profitData result count:', result.length);
    return result;
  }, [transactions, menu]);

  // Pagination logic
  const totalPages = Math.ceil(profitData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return profitData.slice(start, start + itemsPerPage)
  }, [profitData, currentPage, itemsPerPage])

  const grandTotalResult = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions.reduce((sum: number, tx: any) => sum + (Number(tx.total_amount || tx.totalAmount) || 0), 0);
  }, [transactions]);

  // Summary stats
  const summary = useMemo(() => {
    const totalRevenue = profitData.reduce((sum, p) => sum + p.totalRevenue, 0)
    const totalCOGS = profitData.reduce((sum, p) => sum + p.totalCOGS, 0)
    const totalProfit = profitData.reduce((sum, p) => sum + p.totalProfit, 0)
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalCOGS,
      totalProfit,
      avgMargin,
      grandTotal: grandTotalResult,
      totalItems: profitData.length,
    }
  }, [profitData, grandTotalResult])

  if (authLoading || menuLoading) {
    return <ProfitSkeleton />;
  }

  return (
    <AppShell>
      <div className="space-y-6 p-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Laporan Laba Rugi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analisis profit margin per item dan ringkasan keuangan.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            variants={filterVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            {/* Quick Filters - Full width on mobile */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-full sm:w-auto">
              <button
                onClick={() => setDate({ from: startOfDay(new Date()), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDate({ from: addDays(new Date(), -6), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(addDays(new Date(), -6), 'yyyy-MM-dd')
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                7 Hari
              </button>
              <button
                onClick={() => setDate({ from: addDays(new Date(), -29), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(addDays(new Date(), -29), 'yyyy-MM-dd')
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                30 Hari
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "flex-1 sm:w-[260px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "dd MMM", { locale: id })} - {format(date.to, "dd MMM yyyy", { locale: id })}
                          </>
                        ) : (
                          format(date.from, "dd MMM yyyy", { locale: id })
                        )
                      ) : (
                        "Pilih tanggal"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                size="icon" 
                className="shrink-0"
                onClick={() => mutate()} 
                disabled={isFetching || isValidating}
              >
                <RefreshCw className={cn("h-4 w-4", (isFetching || isValidating) && "animate-spin")} />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          <div className="space-y-6">
            {/* Summary Cards */}
              {/* Summary Cards */}
              <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${(isFetching || isValidating) ? 'opacity-70' : ''}`}>
                <motion.div
                  className="rounded-xl border bg-card p-4 relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute top-3 right-3">
                    <InfoModal
                      title={profitInfo.totalRevenue.title}
                      content={profitInfo.totalRevenue.content}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Total Pendapatan (Bruto)</span>
                  </div>
                  {(isFetching || isValidating) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memuat...</span>
                    </div>
                  ) : (
                    <div className="text-xl font-bold">{formatRupiah(summary.grandTotal)}</div>
                  )}
                </motion.div>

                <motion.div
                  className="rounded-xl border bg-card p-4 relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="absolute top-3 right-3">
                    <InfoModal
                      title={profitInfo.totalCOGS.title}
                      content={profitInfo.totalCOGS.content}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Total HPP</span>
                  </div>
                  {(isFetching || isValidating) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memuat...</span>
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-amber-600">{formatRupiah(summary.totalCOGS)}</div>
                  )}
                </motion.div>

                <motion.div
                  className="rounded-xl border bg-card p-4 relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute top-3 right-3">
                    <InfoModal
                      title={profitInfo.totalProfit.title}
                      content={profitInfo.totalProfit.content}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Laba Kotor</span>
                  </div>
                  {(isFetching || isValidating) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memuat...</span>
                    </div>
                  ) : (
                    <div className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatRupiah(summary.totalProfit)}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="rounded-xl border bg-card p-4 relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="absolute top-3 right-3">
                    <InfoModal
                      title={profitInfo.avgMargin.title}
                      content={profitInfo.avgMargin.content}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Margin Rata-rata</span>
                  </div>
                  {(isFetching || isValidating) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memuat...</span>
                    </div>
                  ) : (
                    <div className={`text-xl font-bold ${summary.avgMargin >= 50 ? 'text-emerald-600' : summary.avgMargin >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                      {summary.avgMargin.toFixed(1)}%
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Profit Table */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto relative min-h-[400px]">
                  {/* Loading Overlay */}
                  <AnimatePresence>
                    {(isFetching || isValidating) && profitData.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none"
                      >
                        <div className="bg-card border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs font-medium">Memperbarui...</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Item</th>
                        <th className="px-4 py-3 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">Terjual</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Harga Jual</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">HPP</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Pendapatan</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Laba</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Margin</th>
                        <th className="px-4 py-3 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                            {isFetching ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                                <p className="text-xs">Memuat data...</p>
                              </div>
                            ) : (
                              <>
                                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <div className="text-sm font-medium">Belum ada data penjualan</div>
                                <div className="text-xs">Transaksi akan otomatis dihitung labanya</div>
                              </>
                            )}
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {paginatedData.map((p, idx) => (
                            <motion.tr
                              key={p.menuId}
                              className="border-t last:border-b-0"
                              variants={rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ delay: idx * 0.03, duration: 0.15, ease: "easeOut" }}
                              whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">{p.menuName}</div>
                                <div className="text-xs text-muted-foreground">{p.category}</div>
                              </td>
                              <td className="px-4 py-3 text-center font-bold">{p.totalQtySold}</td>
                              <td className="px-4 py-3 text-right">{formatRupiah(p.sellingPrice)}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{formatRupiah(p.hppPrice)}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatRupiah(p.totalRevenue)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${p.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatRupiah(p.totalProfit)}
                              </td>
                              <td className="px-4 py-3 text-right relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTooltipId(tooltipId === p.menuId ? null : p.menuId);
                                  }}
                                  className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors hover:opacity-80 ${p.profitMargin >= 50 ? 'bg-emerald-500/10 text-emerald-600' :
                                      p.profitMargin >= 30 ? 'bg-amber-500/10 text-amber-600' :
                                        'bg-red-500/10 text-red-600'
                                    }`}
                                >
                                  {p.profitMargin.toFixed(1)}%
                                </button>

                                {tooltipId === p.menuId && (() => {
                                  const markupPercent = p.hppPrice > 0 ? ((p.sellingPrice - p.hppPrice) / p.hppPrice) * 100 : 0;
                                  const targetMargin = 30;
                                  const targetMarkup = (targetMargin / 100) / (1 - targetMargin / 100) * 100;
                                  const targetSellingPrice = p.hppPrice / (1 - targetMargin / 100);
                                  const priceDiff = targetSellingPrice - p.sellingPrice;
                                  return (
                                    <>
                                      <div className="fixed inset-0 bg-black/20 z-[90]" onClick={() => setTooltipId(null)} />
                                      <div className="margin-tooltip fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90vw] max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
                                        {/* Header */}
                                        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                                          <div>
                                            <h4 className="font-semibold text-sm">{p.menuName}</h4>
                                            <p className="text-[10px] text-muted-foreground">{p.category}</p>
                                          </div>
                                          <button
                                            onClick={() => setTooltipId(null)}
                                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>

                                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                                          {/* Harga */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-muted/30 rounded-lg p-3">
                                              <div className="text-[10px] text-muted-foreground mb-1">Harga Modal (HPP)</div>
                                              <div className="font-semibold text-sm">{formatRupiah(p.hppPrice)}</div>
                                            </div>
                                            <div className="bg-muted/30 rounded-lg p-3">
                                              <div className="text-[10px] text-muted-foreground mb-1">Harga Jual</div>
                                              <div className="font-semibold text-sm">{formatRupiah(p.sellingPrice)}</div>
                                            </div>
                                          </div>

                                          {/* Markup vs Margin */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-primary/10 rounded-lg border border-primary/20 p-3">
                                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Markup</div>
                                              <div className="font-bold text-primary text-xl">{markupPercent.toFixed(1)}%</div>
                                              <div className="text-[9px] text-muted-foreground">Dari modal</div>
                                            </div>
                                            <div className="bg-amber-500/10 rounded-lg border border-amber-500/20 p-3">
                                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Margin</div>
                                              <div className="font-bold text-amber-600 text-xl">{p.profitMargin.toFixed(1)}%</div>
                                              <div className="text-[9px] text-muted-foreground">Dari harga jual</div>
                                            </div>
                                          </div>

                                          {/* Penjelasan */}
                                          <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 p-3">
                                            <div className="font-semibold text-blue-600 mb-2 text-xs">Kenapa Margin Lebih Kecil dari Markup?</div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed mb-3">
                                              Markup <strong className="text-foreground">{markupPercent.toFixed(1)}%</strong> menghasilkan Margin <strong className="text-foreground">{p.profitMargin.toFixed(1)}%</strong> karena cara hitungnya berbeda.
                                            </p>
                                            <div className="space-y-1 text-[10px]">
                                              <div className="flex justify-between text-muted-foreground">
                                                <span>Rumus Markup</span>
                                                <span className="font-mono text-foreground">(Jual − Modal) / Modal × 100</span>
                                              </div>
                                              <div className="flex justify-between text-muted-foreground">
                                                <span>Rumus Margin</span>
                                                <span className="font-mono text-foreground">Laba / Pendapatan × 100</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Konversi */}
                                          <div className="bg-emerald-500/10 rounded-lg border border-emerald-500/20 p-3">
                                            <div className="font-semibold text-emerald-600 mb-2 text-xs">Untuk Dapat Margin {targetMargin}%?</div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed mb-3">
                                              Harga jual saat ini <strong className="text-foreground">{formatRupiah(p.sellingPrice)}</strong> (Margin {p.profitMargin.toFixed(1)}%). Untuk <strong className="text-emerald-600">Margin {targetMargin}%</strong>, harga jual harus <strong className="text-emerald-600">{formatRupiah(targetSellingPrice)}</strong>.
                                            </p>
                                            <div className="space-y-2 text-[10px]">
                                              <div className="font-mono bg-muted/30 rounded-md px-3 py-2 space-y-0.5">
                                                <div className="text-muted-foreground">Harga Target = HPP ÷ (1 − 0.30)</div>
                                                <div className="text-muted-foreground">       = {formatRupiah(p.hppPrice)} ÷ 0.70</div>
                                                <div className="text-emerald-600 font-semibold">       = {formatRupiah(targetSellingPrice)}</div>
                                              </div>
                                              <div className="flex justify-between items-center px-1">
                                                <span className="text-muted-foreground">Markup yang dibutuhkan</span>
                                                <span className="font-semibold text-emerald-600">{targetMarkup.toFixed(1)}%</span>
                                              </div>
                                              {priceDiff > 0 && (
                                                <div className="flex justify-between items-center px-1">
                                                  <span className="text-muted-foreground">Naikkan harga</span>
                                                  <span className="font-semibold text-amber-600">+{formatRupiah(priceDiff)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="bg-muted/20 rounded-md p-2.5 text-[10px] text-muted-foreground text-center">
                                            💡 <strong>Markup</strong> = keuntungan dari modal • <strong>Margin</strong> = keuntungan dari harga jual
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {idx < 3 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                                    <ArrowUpRight className="h-3 w-3" />
                                    Top
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {profitData.length > itemsPerPage && (
                  <div className={`p-4 border-t bg-muted/20 ${(isFetching || isValidating) ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-center gap-2">
                      {/* First Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || isFetching || isValidating}
                        title="Halaman Pertama"
                      >
                        <ChevronFirst className="h-4 w-4" />
                      </Button>
                      
                      {/* Previous */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || isFetching || isValidating}
                        title="Sebelumnya"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 mx-1">
                        {(() => {
                          const pages = [];
                          
                          // Always show first page
                          if (currentPage > 3) {
                            pages.push(1);
                            if (currentPage > 4) {
                              pages.push('ellipsis-start');
                            }
                          }
                          
                          // Calculate range around current page
                          const rangeStart = Math.max(1, currentPage - 1);
                          const rangeEnd = Math.min(totalPages, currentPage + 1);
                          
                          for (let i = rangeStart; i <= rangeEnd; i++) {
                            if (!pages.includes(i)) {
                              pages.push(i);
                            }
                          }
                          
                          // Always show last page
                          if (currentPage < totalPages - 2) {
                            if (currentPage < totalPages - 3) {
                              pages.push('ellipsis-end');
                            }
                            if (!pages.includes(totalPages)) {
                              pages.push(totalPages);
                            }
                          }
                          
                          return pages.map((pageNum) => {
                            if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                              return (
                                <span key={pageNum} className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                                  …
                                </span>
                              );
                            }
                            
                            return (
                              <Button
                                key={`page-${pageNum}`}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                className="h-8 w-8 p-0 text-xs"
                                onClick={() => setCurrentPage(pageNum as number)}
                                disabled={isFetching || isValidating}
                              >
                                {pageNum}
                              </Button>
                            );
                          });
                        })()}
                      </div>

                      {/* Next */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || isFetching || isValidating}
                        title="Selanjutnya"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Last Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || isFetching || isValidating}
                        title="Halaman Terakhir"
                      >
                        <ChevronLast className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Page Info */}
                    <div className="text-center mt-2 text-xs text-muted-foreground">
                      Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, profitData.length)}</span> dari <span className="font-medium text-foreground">{profitData.length}</span> item
                    </div>
                  </div>
                )}
              </div>
            </div>
        </motion.div>
      </div>
    </AppShell>
  )
}
