'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppShell } from "@/components/app-shell";
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  ShieldCheck,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wifi,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Megaphone,
  Send,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface Metrics {
  cafes: { total: number };
  users: { superadmin: number; admin: number; cashier: number; total: number };
  transactions: { today: number; week: number; month: number };
  revenue: { today: number; week: number; month: number };
  approvals: { pending: number };
  activity: { online: number };
}

export default function SuperadminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveUpdateActive, setLiveUpdateActive] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const router = useRouter();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/superadmin/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setLiveUpdateActive(true);
    } catch (err) {
      toast.error('Gagal mengambil data dashboard');
      setLiveUpdateActive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) {
      router.push('/dashboard');
      return;
    }
    if (userData?.role === 'superadmin') fetchMetrics();
  }, [userData, authLoading, router]);

  // Auto-refresh metrics every 60 seconds
  useEffect(() => {
    if (userData?.role !== 'superadmin') return;
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [userData?.role]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Judul dan isi pengumuman tidak boleh kosong');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/superadmin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          body: broadcastBody,
          url: '/dashboard'
        })
      });

      if (!res.ok) throw new Error('Gagal mengirim siaran');
      
      toast.success('Pengumuman berhasil disiarkan ke seluruh pengguna');
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyiarkan pengumuman');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full"
          />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat dashboard...</p>
        </div>
      </AppShell>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monitoring dan manajemen platform</p>
          </div>
          <div className="flex items-center gap-2">
            {liveUpdateActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Live Update</span>
              </div>
            )}
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm text-sm font-medium"
            >
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Siaran Global</span>
            </button>
            <button
              onClick={fetchMetrics}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Cafe',
              value: metrics?.cafes.total || 0,
              icon: Building2,
              color: 'bg-blue-500/10 text-blue-600',
              trend: null
            },
            {
              label: 'Total Pengguna',
              value: metrics?.users.total || 0,
              icon: Users,
              color: 'bg-purple-500/10 text-purple-600',
              trend: null
            },
            {
              label: 'Transaksi Hari Ini',
              value: metrics?.transactions.today || 0,
              icon: ShoppingCart,
              color: 'bg-emerald-500/10 text-emerald-600',
              trend: metrics?.transactions.week ? ((metrics.transactions.today / (metrics.transactions.week / 7)) * 100).toFixed(0) : null
            },
            {
              label: 'Revenue Hari Ini',
              value: formatCurrency(metrics?.revenue.today || 0),
              icon: DollarSign,
              color: 'bg-amber-500/10 text-amber-600',
              trend: metrics?.revenue.week ? ((metrics.revenue.today / (metrics.revenue.week / 7)) * 100).toFixed(0) : null
            }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-4 rounded-xl border border-border/50 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    Number(stat.trend) > 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {Number(stat.trend) > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(Number(stat.trend))}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* User Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card p-6 rounded-xl border border-border/50 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Distribusi Pengguna
            </h3>
            <div className="space-y-4">
              {[
                { role: 'Superadmin', count: metrics?.users.superadmin || 0, color: 'bg-purple-500' },
                { role: 'Admin', count: metrics?.users.admin || 0, color: 'bg-blue-500' },
                { role: 'Cashier', count: metrics?.users.cashier || 0, color: 'bg-slate-500' }
              ].map((item) => (
                <div key={item.role}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.role}</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(item.count)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / (metrics?.users.total || 1)) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={cn("h-full rounded-full", item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card p-6 rounded-xl border border-border/50 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Aktivitas Platform
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Online Sekarang</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(metrics?.activity.online || 0)}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Transaksi Minggu Ini</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(metrics?.transactions.week || 0)}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Laba Bulan Ini</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.revenue.month || 0)}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs text-muted-foreground">Menunggu Persetujuan</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(metrics?.approvals.pending || 0)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Pending Approvals Alert */}
        {metrics && (metrics.approvals.pending || 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Menunggu Persetujuan</p>
                  <p className="text-sm text-amber-700">
                    {formatNumber(metrics.approvals.pending)} pengguna menunggu persetujuan akses
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/superadmin/users')}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition text-sm font-medium"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Kelola</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card p-6 rounded-xl border border-border/50 shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/superadmin/users')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition"
            >
              <Users className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">Kelola Pengguna</span>
            </button>
            <button
              onClick={() => router.push('/superadmin/cafes')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition"
            >
              <Building2 className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-medium">Kelola Cafe</span>
            </button>
            <button
              onClick={() => router.push('/reports/profit')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition"
            >
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium">Laporan Keuangan</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition"
            >
              <Activity className="w-6 h-6 text-amber-600" />
              <span className="text-sm font-medium">Pengaturan</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-border/50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold">Siaran Global (Push Notification)</h2>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBroadcast} className="p-4 space-y-4">
              <div className="bg-amber-500/10 text-amber-600 text-xs p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Notifikasi ini akan dikirimkan ke semua perangkat admin cafe yang telah mengizinkan notifikasi browser.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Misal: Pemeliharaan Server Malam Ini"
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Isi Pesan</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Tulis pesan pengumuman..."
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-lg hover:bg-muted font-medium text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                      />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Siaran</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
