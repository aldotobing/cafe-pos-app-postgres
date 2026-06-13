'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppShell } from "@/components/app-shell";
import {
  Building2, Users, ShoppingCart, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Wifi, RefreshCw,
  Megaphone, Send, X, TrendingUp, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface Metrics {
  cafes: { total: number };
  users: { superadmin: number; admin: number; cashier: number; total: number };
  transactions: { today: number; week: number; month: number };
  revenue: { today: number; week: number; month: number };
  activity: { online: number; inactive: number };
}

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const formatNumber = (v: number) => new Intl.NumberFormat('id-ID').format(v);

export default function SuperadminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [broadcast, setBroadcast] = useState({ title: '', body: '' });
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/metrics');
      if (!res.ok) throw new Error('Failed');
      setMetrics(await res.json());
    } catch { toast.error('Gagal mengambil data dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) { router.push('/dashboard'); return; }
    if (userData?.role === 'superadmin') fetchMetrics();
  }, [userData, authLoading, router]);

  useEffect(() => {
    if (userData?.role !== 'superadmin') return;
    const i = setInterval(fetchMetrics, 60000);
    return () => clearInterval(i);
  }, [userData?.role]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title.trim() || !broadcast.body.trim()) { toast.error('Judul dan isi tidak boleh kosong'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/superadmin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: broadcast.title, body: broadcast.body, url: '/dashboard' }) });
      if (!res.ok) throw new Error('Gagal');
      toast.success('Pengumuman berhasil disiarkan');
      setModal(false);
      setBroadcast({ title: '', body: '' });
    } catch { toast.error('Gagal menyiarkan pengumuman'); }
    finally { setSending(false); }
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-[3px] border-primary/30 border-t-primary rounded-full" />
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </AppShell>
    );
  }

  const stats = [
    { label: 'Total Cafe', value: metrics?.cafes.total || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Total Pengguna', value: metrics?.users.total || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Transaksi Hari Ini', value: metrics?.transactions.today || 0, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Pendapatan Hari Ini', value: formatCurrency(metrics?.revenue.today || 0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-500/10', isCurrency: true },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dasbor Platform</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Pantau semua aktivitas di satu tempat</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition text-sm font-semibold shadow-sm">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Siaran</span>
            </button>
            <button onClick={fetchMetrics} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-semibold shadow-sm">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={cn("p-2.5 rounded-xl", s.bg)}>
                  <s.icon className={cn("w-5 h-5", s.color)} />
                </div>
              </div>
              <p className={cn("mt-4 font-bold tracking-tight", s.isCurrency ? "text-xl" : "text-3xl")}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* User Distribution + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* User Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" /> Distribusi Pengguna</h3>
            <div className="space-y-4">
              {[{ role: 'Superadmin', count: metrics?.users.superadmin || 0, color: 'bg-purple-500' }, { role: 'Admin Cafe', count: metrics?.users.admin || 0, color: 'bg-blue-500' }, { role: 'Kasir', count: metrics?.users.cashier || 0, color: 'bg-slate-500' }].map(item => (
                <div key={item.role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{item.role}</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(item.count)}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / (metrics?.users.total || 1)) * 100}%` }} transition={{ duration: 0.6, delay: 0.2 }} className={cn("h-full rounded-full", item.color)} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Activity */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> Aktivitas Platform</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Wifi, label: 'Online', value: formatNumber(metrics?.activity.online || 0), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { icon: ShoppingCart, label: 'Transaksi/Minggu', value: formatNumber(metrics?.transactions.week || 0), color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { icon: DollarSign, label: 'Pendapatan/Bulan', value: formatCurrency(metrics?.revenue.month || 0), color: 'text-amber-500', bg: 'bg-amber-500/10', compact: true },
                { icon: Clock, label: 'Nonaktif', value: formatNumber(metrics?.activity.inactive || 0), color: 'text-rose-500', bg: 'bg-rose-500/10' },
              ].map(item => (
                <div key={item.label} className={cn("rounded-xl p-4", item.bg)}>
                  <div className="flex items-center gap-2 mb-1"><item.icon className={cn("w-4 h-4", item.color)} /><span className="text-xs text-muted-foreground">{item.label}</span></div>
                  <p className={cn("font-bold", item.compact ? "text-sm" : "text-xl")}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Pengguna', href: '/superadmin/users', color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { icon: Building2, label: 'Cafe', href: '/superadmin/cafes', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { icon: TrendingUp, label: 'Laporan', href: '/reports/profit', color: 'text-purple-600', bg: 'bg-purple-500/10' },
              { icon: Activity, label: 'Pengaturan', href: '/settings', color: 'text-amber-600', bg: 'bg-amber-500/10' },
            ].map(item => (
              <button key={item.label} onClick={() => router.push(item.href)} className={cn("flex flex-col items-center gap-3 p-5 rounded-xl transition hover:scale-[1.02] active:scale-[0.98]", item.bg)}>
                <item.icon className={cn("w-6 h-6", item.color)} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Broadcast Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-500" /><h2 className="font-semibold">Siaran Global</h2></div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBroadcast} className="p-5 space-y-4">
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Push notification akan dikirim ke semua admin cafe yang mengizinkan notifikasi browser.</span>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Judul</label>
                <input type="text" required value={broadcast.title} onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))} placeholder="Pemeliharaan Server" className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Pesan</label>
                <textarea required rows={4} value={broadcast.body} onChange={e => setBroadcast(p => ({ ...p, body: e.target.value }))} placeholder="Tulis pesan..." className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 rounded-xl hover:bg-muted font-medium text-sm transition">Batal</button>
                <button type="submit" disabled={sending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition disabled:opacity-50">
                  {sending ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /><span>Mengirim...</span></> : <><Send className="w-4 h-4" /><span>Kirim</span></>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
