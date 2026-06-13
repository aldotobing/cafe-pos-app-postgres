'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from "@/components/app-shell";
import {
  Building2, Search, MapPin, Phone, Calendar, ChevronDown,
  RefreshCw, TrendingUp, CheckCircle2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface Cafe {
  id: number; name: string; address?: string; phone?: string;
  owner_user_id: string; created_at: string;
  owner?: { email?: string; full_name?: string };
  cafe_settings?: { name?: string; tagline?: string };
}

export default function CafesManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const router = useRouter();

  const fetchCafes = async () => {
    try { setLoading(true); const res = await fetch('/api/superadmin/cafes'); if (!res.ok) throw new Error('Failed'); setCafes((await res.json()).cafes || []); }
    catch { toast.error('Gagal mengambil data cafe'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) { router.push('/dashboard'); return; }
    if (userData?.role === 'superadmin') fetchCafes();
  }, [userData, authLoading, router]);

  const filtered = useMemo(() => {
    if (!search) return cafes;
    const s = search.toLowerCase();
    return cafes.filter(c => c.name.toLowerCase().includes(s) || c.address?.toLowerCase().includes(s) || c.owner?.email?.toLowerCase().includes(s) || c.owner?.full_name?.toLowerCase().includes(s));
  }, [cafes, search]);

  const stats = useMemo(() => ({
    total: cafes.length,
    newThisMonth: cafes.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
  }), [cafes]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-[3px] border-primary/30 border-t-primary rounded-full" />
          <p className="text-sm text-muted-foreground">Memuat data cafe...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manajemen Cafe</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{stats.total} cafe terdaftar di platform</p>
          </div>
          <button onClick={fetchCafes} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-semibold shadow-sm">
            <RefreshCw className="w-4 h-4" /> Segarkan
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Total Cafe', value: stats.total, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-500/10' }, { label: 'Baru Bulan Ini', value: stats.newThisMonth, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-500/10' }].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className={cn("p-2.5 rounded-xl w-fit", s.bg)}><s.icon className={cn("w-5 h-5", s.color)} /></div>
              <p className="mt-3 text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari cafe berdasarkan nama, alamat, atau owner..." className="w-full pl-10 pr-10 py-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted transition"><X className="w-4 h-4 text-muted-foreground" /></button>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                {['Cafe', 'Owner', 'Lokasi', 'Telepon', 'Terdaftar', ''].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map(cafe => (
                <tr key={cafe.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{cafe.name.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{cafe.name}</p>
                        {cafe.cafe_settings?.tagline && <p className="text-xs text-muted-foreground truncate">{cafe.cafe_settings.tagline}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium">{cafe.owner?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{cafe.owner?.email || '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground max-w-[180px] truncate">{cafe.address || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{cafe.phone || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{new Date(cafe.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => router.push(`/dashboard?cafe_id=${cafe.id}`)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-primary/10 text-primary transition" title="Lihat Dashboard">
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{search ? 'Tidak ada cafe yang cocok' : 'Belum ada cafe terdaftar'}</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(cafe => (
              <motion.div key={cafe.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div onClick={() => setExpanded(expanded === cafe.id ? null : cafe.id)} className="p-4 flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{cafe.name.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{cafe.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{cafe.owner?.full_name || 'Tanpa owner'}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", expanded === cafe.id && "rotate-180")} />
                </div>
                <AnimatePresence>
                  {expanded === cafe.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {cafe.address && <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><span className="text-muted-foreground">{cafe.address}</span></div>}
                          {cafe.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">{cafe.phone}</span></div>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Didaftarkan {new Date(cafe.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <button onClick={() => router.push(`/dashboard?cafe_id=${cafe.id}`)} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">Lihat Dasbor</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{search ? 'Tidak ada cafe yang cocok' : 'Belum ada cafe terdaftar'}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
