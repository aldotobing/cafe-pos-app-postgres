"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useMemo, useState } from "react"
import { formatRupiah, getJakartaNow } from "../../lib/format"
import { useCountUp, useCountUpFormatted } from "@/hooks/use-count-up"
import { useMenu, useTransactions } from "@/hooks/use-cafe-data"
import { TrendingUp, CreditCard, Package, DollarSign } from "lucide-react"
import { FinancialSummaryCard } from "@/components/dashboard/FinancialSummaryCard"
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { WeeklySummary } from "@/components/dashboard/WeeklySummary"
import { StatCard } from "@/components/statistik/StatCard"
import { DashboardSkeleton } from "@/components/skeletons"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const urlCafeId = searchParams.get('cafe_id');
  const cafeId = authLoading ? null : ((userData?.role === 'superadmin' && urlCafeId) ? Number(urlCafeId) : userData?.cafe_id ?? null);
  const { menu, isLoading: menuLoading } = useMenu(cafeId ?? undefined);
  // Use limit=1000 to fetch all transactions for dashboard stats
  const { transactions, isLoading: transactionsLoading } = useTransactions(cafeId ?? undefined, 1000);
  const router = useRouter();

  // Transactions are already filtered by cafe_id in the hook
  const cafeTransactions = transactions;

  // Use Jakarta timezone (GMT+7) for all date computations
  const jakartaNow = getJakartaNow(); // "2026-06-13 14:30:00"
  const jakartaToday = jakartaNow.split(' ')[0]; // "2026-06-13"
  // Midnight Jakarta in UTC epoch: "2026-06-13T00:00:00+07:00"
  const jakartaTodayStart = new Date(jakartaToday + 'T00:00:00+07:00').getTime();

  const { totalHariIni, jumlahTransaksi, topItem, topItemCount, weeklyRevenue } = useMemo(() => {
    let totalHariIni = 0
    let jumlahTransaksi = 0
    const itemCountById: Record<string, number> = {}
    const itemNameById: Record<string, string> = {}

    // Calculate weekly revenue — last 7 days in Jakarta timezone.
    // Work in "shifted UTC" space: add 7h so UTC date ops produce Jakarta dates.
    const nowShifted = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const weeklyMap: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nowShifted);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    // Initialize map
    last7Days.forEach(date => weeklyMap[date] = 0);

    for (const t of cafeTransactions) {
      const dateValue = t.createdAt;
      let date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        date = new Date();
      }

      // Convert stored UTC timestamp to Jakarta date string by adding 7h offset
      const dateStr = new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Daily stats — compare stored UTC timestamp against Jakarta midnight (in UTC)
      if (date.getTime() >= jakartaTodayStart) {
        totalHariIni += t.totalAmount || 0
        jumlahTransaksi += 1
        for (const it of t.items) {
          const menuId = it.menuId || 'unknown'
          const itemName = it.name || 'Unknown Item'
          const itemQty = it.qty ?? (it.quantity ?? 1)
          itemCountById[menuId] = (itemCountById[menuId] || 0) + itemQty
          if (!itemNameById[menuId] || itemName.length <= itemNameById[menuId].length) {
            itemNameById[menuId] = itemName
          }
        }
      }

      // Weekly stats
      if (weeklyMap.hasOwnProperty(dateStr)) {
        weeklyMap[dateStr] += t.totalAmount || 0;
      }
    }

    const sorted = Object.entries(itemCountById).sort((a, b) => b[1] - a[1])
    const topEntry = sorted[0]
    const topItem = topEntry ? (itemNameById[topEntry[0]] || topEntry[0].slice(0, 8)) : "-"
    const topItemCount = topEntry ? topEntry[1] : 0

    const weeklyRevenue = Object.entries(weeklyMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totalHariIni, jumlahTransaksi, topItem, topItemCount, weeklyRevenue }
  }, [cafeTransactions])

  const last5 = useMemo(() => {
    return [...cafeTransactions]
      .sort((a, b) => {
        const dateA = typeof a.createdAt === 'number' ? new Date(a.createdAt) : new Date(a.createdAt);
        const dateB = typeof b.createdAt === 'number' ? new Date(b.createdAt) : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(t => ({
        ...t,
        paymentMethod: t.paymentMethod || 'cash',
        totalAmount: t.totalAmount || 0,
        items: t.items.map(it => ({
          ...it,
          name: it.name || (it as any).menu_name || (it as any).menuName || "Unknown Item",
          qty: it.qty || (it as any).quantity || 1
        }))
      }));
  }, [cafeTransactions])

  const animatedRevenue = useCountUpFormatted(totalHariIni, formatRupiah, 800)
  const animatedTxCount = useCountUp(jumlahTransaksi, 800, 0)
  const animatedMenuCount = useCountUp(menu.length, 600, 0)

  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && userData) {
      if (userData.role === 'cashier' && !userData.cafe_id) {
        router.push('/login');
        return;
      }

      if (userData.role === 'admin' && !userData.cafe_id) {
        router.push('/create-cafe');
        return;
      }
    }
  }, [user, userData, authLoading, router]);

  if (authLoading || menuLoading || transactionsLoading || !cafeId) {
    return <DashboardSkeleton />;
  }

  return (
    <AppShell>
      <div className="space-y-4 md:space-y-8 p-1">
        <DashboardHeader userName={(userData?.full_name || userData?.fullName || userData?.email?.split('@')[0] || 'Pengguna').split(' ')[0]} />

        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Combined card: mobile only */}
          <motion.div variants={itemVariants} className="h-full md:hidden col-span-2">
            <div className="rounded-lg border border-border bg-card shadow-subtle p-3 h-full">
              <div className="flex divide-x divide-border h-full items-stretch">
                <div className="flex-1 min-w-0 px-3 flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Penjualan</p>
                  <p className="text-base font-bold truncate" title={String(animatedRevenue)}>{animatedRevenue}</p>
                </div>
                <div className="px-3 flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Transaksi</p>
                  <p className="text-base font-bold">{animatedTxCount}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Desktop: separate cards */}
          <motion.div variants={itemVariants} className="h-full hidden md:block">
            <StatCard title="Penjualan Hari Ini" value={animatedRevenue} description="" icon={DollarSign} iconClassName="text-emerald-500 bg-emerald-500/10" />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full hidden md:block">
            <StatCard title="Transaksi Hari Ini" value={animatedTxCount} description="" icon={CreditCard} iconClassName="text-blue-400 bg-blue-400/10" />
          </motion.div>

          {/* Menu Terlaris: compact on mobile, full StatCard on md+ */}
          <motion.div variants={itemVariants} className="h-full md:hidden">
            <div className="rounded-lg border border-border bg-card shadow-subtle p-3 h-full flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Menu Terlaris</p>
              <p className="text-base font-bold truncate" title={String(topItem)}>{topItem}</p>
              {topItemCount > 0 && <p className="text-[10px] text-muted-foreground">{topItemCount}x dipesan</p>}
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="h-full hidden md:block">
            <StatCard title="Menu Terlaris" value={topItem} description={topItemCount > 0 ? `${topItemCount}x dipesan` : ""} icon={TrendingUp} iconClassName="text-amber-400 bg-amber-400/10" />
          </motion.div>

          {/* Total Produk: compact on mobile, full StatCard on md+ */}
          <motion.div variants={itemVariants} className="h-full md:hidden">
            <div className="rounded-lg border border-border bg-card shadow-subtle p-3 h-full flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Total Produk</p>
              <p className="text-base font-bold">{animatedMenuCount}</p>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="h-full hidden md:block">
            <StatCard title="Total Produk" value={animatedMenuCount} description="" icon={Package} iconClassName="text-purple-400 bg-purple-400/10" />
          </motion.div>
        </motion.div>

        <motion.div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-4 h-full">
            <WeeklySummary data={weeklyRevenue} />
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-3 w-full h-full">
            <FinancialSummaryCard />
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <RecentTransactions transactions={last5} />
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  )
}