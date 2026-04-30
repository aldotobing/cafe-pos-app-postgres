'use client';

import { useState, useMemo, useEffect } from 'react';
import { useMenu, useCategories, useCafeSettings } from '@/hooks/use-cafe-data';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { formatRupiah, formatTanggal } from '@/lib/format';
import {
  Calendar as CalendarIcon,
  CreditCard,
  TrendingUp,
  Users,
  Package,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from '@/components/statistik/StatCard';
import { RevenueChart } from '@/components/statistik/RevenueChart';
import { CategoryChart } from '@/components/statistik/CategoryChart';
import { TopItemsTable } from '@/components/statistik/TopItemsTable';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { generateFinancialReport } from '@/lib/reports/financial-report';
import { toast } from 'sonner';
import useSWR from 'swr';
import { swrConfigForTransactions } from '@/lib/swr-config';

export default function StatistikPage() {
  const { userData, loading: authLoading, user } = useAuth();
  const cafeId = userData?.cafe_id;
  const { menu, isLoading: menuLoading } = useMenu(cafeId);
  const { categories, isLoading: categoriesLoading } = useCategories(cafeId);
  const { settings } = useCafeSettings(cafeId);

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  // Format dates for API query - memoized to prevent unnecessary recalculations
  const dateParams = useMemo(() => {
    const startDateStr = format(date?.from || addDays(new Date(), -29), 'yyyy-MM-dd');
    const endDateStr = format(addDays(date?.to || date?.from || new Date(), 1), 'yyyy-MM-dd');
    return { startDateStr, endDateStr };
  }, [date]);

  // Use SWR for fetching and caching
  // NOTE: Use large limit (1000) to fetch all transactions for statistik calculation
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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const statisticData = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return null;
    const filteredTransactions = transactions;
    const totalTransactions = filteredTransactions.length;
    const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const itemSales: Record<string, { count: number; revenue: number }> = {};
    filteredTransactions.forEach(tx => {
      const items = tx.items || [];
      items.forEach((item: any) => {
        const itemName = item.name || 'Unknown';
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0;
        const lineTotal = Number(item.lineTotal) || (price * qty - discount);

        if (itemSales[itemName]) {
          itemSales[itemName].count += qty;
          itemSales[itemName].revenue += lineTotal;
        } else {
          itemSales[itemName] = { count: qty, revenue: lineTotal };
        }
      });
    });

    const topSellingItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailyRevenueMap: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      const createdAt = tx.created_at || tx.createdAt;
      if (!createdAt) return;
      const dateStr = createdAt.split(' ')[0].split('T')[0];
      const amount = Number(tx.total_amount || tx.totalAmount) || 0;
      dailyRevenueMap[dateStr] = (dailyRevenueMap[dateStr] || 0) + amount;
    });

    // Create a continuous list of dates for the selected range
    const dailyRevenue: Array<{date: string, revenue: number}> = [];
    if (date?.from) {
      const start = startOfDay(date.from);
      const end = startOfDay(date.to || date.from);
      
      let current = start;
      while (current <= end) {
        const dStr = format(current, 'yyyy-MM-dd');
        dailyRevenue.push({
          date: dStr,
          revenue: dailyRevenueMap[dStr] || 0
        });
        current = addDays(current, 1);
      }
    } else {
      // Fallback to sorted existing data if no range is selected
      Object.entries(dailyRevenueMap)
        .forEach(([date, revenue]) => {
          dailyRevenue.push({ date, revenue });
        });
      dailyRevenue.sort((a, b) => a.date.localeCompare(b.date));
    }

    const categorySales: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      const items = tx.items || [];
      items.forEach((item: any) => {
        const menuId = item.menu_id || item.menuId;
        const menuItem = menu.find(m => m.id === menuId);
        const targetCategory = categories.find(c => c.id === menuItem?.categoryId) ||
          categories.find(c => c.name === menuItem?.category);
        const categoryName = targetCategory?.name || menuItem?.category || 'Lainnya';
        const qty = Number(item.quantity || item.qty) || 0;
        categorySales[categoryName] = (categorySales[categoryName] || 0) + qty;
      });
    });

    const categoryDistribution = Object.entries(categorySales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const totalSubtotal = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.subtotal) || 0), 0);
    const totalTax = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.tax_amount || tx.taxAmount) || 0), 0);
    const totalService = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.service_charge || tx.serviceCharge) || 0), 0);

    const paymentMap: Record<string, { count: number; total: number }> = {};
    filteredTransactions.forEach(tx => {
      const method = tx.payment_method || tx.paymentMethod || 'Lainnya';
      if (!paymentMap[method]) {
        paymentMap[method] = { count: 0, total: 0 };
      }
      paymentMap[method].count += 1;
      paymentMap[method].total += Number(tx.total_amount || tx.totalAmount) || 0;
    });

    const paymentBreakdown = Object.entries(paymentMap).map(([name, data]) => ({
      name,
      ...data
    }));

    return {
      totalTransactions,
      totalRevenue,
      avgTransactionValue,
      topSellingItems,
      dailyRevenue,
      categoryDistribution,
      totalSubtotal,
      totalTax,
      totalService,
      paymentBreakdown
    };
  }, [txs, menu, categories]);

  // Handle the initial empty state while SWR is idle or working
  if (authLoading || menuLoading || categoriesLoading || (isFetching && !txs)) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/30" />
            <p className="text-muted-foreground text-sm font-medium">Memuat statistik...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 sm:space-y-12 p-4 sm:p-6 lg:p-8 pb-16 relative">
        {/* Global Loading Overlay for revalidating */}
        <AnimatePresence>
          {(isFetching || isValidating) && txs && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background/20 backdrop-blur-[1px] flex items-start justify-center pt-24 pointer-events-none"
            >
              <div className="bg-card border shadow-xl rounded-full px-4 py-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-medium">Memperbarui data...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
 
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">Statistik</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
              Analisis performa bisnis dan ringkasan pendapatan Anda secara real-time.
            </p>
          </div>
 
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Filters - Full width on mobile */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate({ from: startOfDay(new Date()), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial h-8 px-4 text-[11px] font-bold transition-all rounded-lg",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (!date?.to || (date?.to && format(date?.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')))
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                HARI INI
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate({ from: startOfDay(addDays(new Date(), -6)), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial h-8 px-4 text-[11px] font-bold transition-all rounded-lg",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(addDays(new Date(), -6), 'yyyy-MM-dd')
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                7 HARI
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate({ from: startOfDay(addDays(new Date(), -29)), to: new Date() })}
                className={cn(
                  "flex-1 sm:flex-initial h-8 px-4 text-[11px] font-bold transition-all rounded-lg",
                  date?.from && format(date.from, 'yyyy-MM-dd') === format(addDays(new Date(), -29), 'yyyy-MM-dd')
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                30 HARI
              </Button>
            </div>
 
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "flex-1 sm:w-auto sm:min-w-[200px] justify-start text-left font-medium h-10 rounded-xl",
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
                        <span>Pilih tanggal</span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={id}
                  />
                </PopoverContent>
              </Popover>
 
              <Button 
                variant="outline" 
                size="icon" 
                className="shrink-0 h-10 w-10 border-primary/10 rounded-xl" 
                onClick={() => mutate()} 
                disabled={isFetching || isValidating}
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", (isFetching || isValidating) && "animate-spin")} />
              </Button>
 
              <Button
                variant="default"
                className="gap-2 h-10 rounded-xl px-5"
                onClick={async () => {
                  if (!statisticData) {
                    toast.error("Tidak ada data untuk diekspor.");
                    return;
                  }
                  try {
                    await generateFinancialReport(
                      statisticData,
                      {
                        from: date?.from || new Date(),
                        to: date?.to || date?.from || new Date()
                      },
                      settings as any || {}
                    );
                    toast.success("Laporan keuangan berhasil diekspor.");
                  } catch (error) {
                    toast.error("Gagal mengekspor laporan keuangan.");
                  }
                }}
                disabled={!statisticData}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          </div>
        </div>
 
        {!statisticData ? (
          <div className="flex flex-col items-center justify-center py-32 bg-muted/5 rounded-[2rem] border-2 border-dashed border-muted/50">
            <Package className="h-20 w-20 text-muted-foreground/20 mb-6" />
            <h3 className="text-2xl font-bold tracking-tight">Belum ada transaksi</h3>
            <p className="text-muted-foreground max-w-sm text-center mt-3 text-sm leading-relaxed">
              Cobalah untuk mengubah rentang tanggal atau mulai membuat transaksi di kasir untuk melihat analisis data.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 sm:space-y-12"
          >
            {/* Summary Cards */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={itemVariants}>
                <StatCard
                  title="Total Pendapatan"
                  value={formatRupiah(statisticData.totalRevenue)}
                  description="Total pendapatan periode ini"
                  icon={DollarSign}
                  iconClassName="text-green-600 bg-green-100"
                  trend={{ value: 12, label: "dari periode lalu", positive: true }}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard
                  title="Total Transaksi"
                  value={statisticData.totalTransactions.toString()}
                  description="Jumlah transaksi berhasil"
                  icon={CreditCard}
                  iconClassName="text-blue-600 bg-blue-100"
                  trend={{ value: 4, label: "dari periode lalu", positive: true }}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard
                  title="Rata-rata Transaksi"
                  value={formatRupiah(statisticData.avgTransactionValue)}
                  description="Nilai rata-rata per bon"
                  icon={TrendingUp}
                  iconClassName="text-amber-600 bg-amber-100"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard
                  title="Item Terjual"
                  value={statisticData.topSellingItems.reduce((acc, item) => acc + item.count, 0).toString()}
                  description="Total item menu terjual"
                  icon={Package}
                  iconClassName="text-purple-600 bg-purple-100"
                />
              </motion.div>
            </div>
 
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <motion.div variants={itemVariants} className="lg:col-span-7 w-full">
                <RevenueChart data={statisticData.dailyRevenue} />
              </motion.div>
              <motion.div variants={itemVariants} className="lg:col-span-5 w-full">
                <CategoryChart data={statisticData.categoryDistribution} />
              </motion.div>
            </div>
 
            {/* Detailed Tables */}
            <motion.div variants={itemVariants} className="w-full">
              <TopItemsTable data={statisticData.topSellingItems} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
