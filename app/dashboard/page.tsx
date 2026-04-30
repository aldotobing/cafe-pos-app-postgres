"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect, useMemo, useState } from "react"
import { formatRupiah } from "../../lib/format"
import { useMenu, useTransactions } from "@/hooks/use-cafe-data"
import { TrendingUp, CreditCard, Package, DollarSign } from "lucide-react"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { QuickActions } from "@/components/dashboard/QuickActions"
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
  const cafeId = userData?.cafe_id;
  const { menu, isLoading: menuLoading } = useMenu(cafeId);
  // Use limit=1000 to fetch all transactions for dashboard stats
  const { transactions, isLoading: transactionsLoading } = useTransactions(cafeId, 1000);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Transactions are already filtered by cafe_id in the hook
  const cafeTransactions = transactions;

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { totalHariIni, jumlahTransaksi, topItem, weeklyRevenue } = useMemo(() => {
    let totalHariIni = 0
    let jumlahTransaksi = 0
    const itemCount: Record<string, number> = {}
    const todayStart = today.getTime();

    // Calculate weekly revenue
    const weeklyMap: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
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
      const dateStr = date.toISOString().split('T')[0];

      // Daily stats
      if (date.getTime() >= todayStart) {
        totalHariIni += t.totalAmount || 0
        jumlahTransaksi += 1
        for (const it of t.items) {
          const itemName = it.name || (it as any).menu_name || (it as any).menuName || "Unknown Item";
          const itemQty = it.qty || (it as any).quantity || 1;
          itemCount[itemName] = (itemCount[itemName] || 0) + itemQty;
        }
      }

      // Weekly stats
      if (weeklyMap.hasOwnProperty(dateStr)) {
        weeklyMap[dateStr] += t.totalAmount || 0;
      }
    }

    const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

    const weeklyRevenue = Object.entries(weeklyMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totalHariIni, jumlahTransaksi, topItem, weeklyRevenue }
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

  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && userData) {
      if (!userData.is_approved && userData.role !== 'superadmin') {
        router.push('/pending-approval');
        return;
      }

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

  if (authLoading || menuLoading || transactionsLoading || !isMounted) {
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
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              title="Penjualan Hari Ini"
              value={formatRupiah(totalHariIni)}
              description="Total pendapatan hari ini"
              icon={DollarSign}
              iconClassName="text-emerald-500 bg-emerald-500/10"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              title="Transaksi Hari Ini"
              value={jumlahTransaksi}
              description="Jumlah bon tercetak"
              icon={CreditCard}
              iconClassName="text-blue-400 bg-blue-400/10"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              title="Menu Terlaris"
              value={topItem}
              description="Item paling banyak dipesan"
              icon={TrendingUp}
              iconClassName="text-amber-400 bg-amber-400/10"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              title="Total Produk"
              value={menu.length}
              description="Menu aktif saat ini"
              icon={Package}
              iconClassName="text-purple-400 bg-purple-400/10"
            />
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
            <QuickActions />
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