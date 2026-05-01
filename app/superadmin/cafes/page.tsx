'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from "@/components/app-shell";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Settings,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface Cafe {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  owner_user_id: string;
  created_at: string;
  owner?: {
    email?: string;
    full_name?: string;
  };
  cafe_settings?: {
    name?: string;
    tagline?: string;
  };
}

export default function CafesManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const router = useRouter();

  const fetchCafes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/superadmin/cafes');
      if (!response.ok) throw new Error('Failed to fetch cafes');
      const data = await response.json();
      setCafes(data.cafes || []);
    } catch (err) {
      toast.error('Gagal mengambil data cafe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) {
      router.push('/dashboard');
      return;
    }
    if (userData?.role === 'superadmin') fetchCafes();
  }, [userData, authLoading, router]);

  const filteredCafes = useMemo(() => {
    if (!searchTerm) return cafes;
    const search = searchTerm.toLowerCase();
    return cafes.filter(cafe =>
      cafe.name.toLowerCase().includes(search) ||
      cafe.address?.toLowerCase().includes(search) ||
      cafe.owner?.email?.toLowerCase().includes(search)
    );
  }, [cafes, searchTerm]);

  const stats = useMemo(() => ({
    total: cafes.length,
    newThisMonth: cafes.filter(c => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(c.created_at) > monthAgo;
    }).length
  }), [cafes]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full"
          />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat data cafe...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manajemen Cafe</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Kelola semua cafe di platform</p>
          </div>
          <button
            onClick={fetchCafes}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Cafe', value: stats.total, icon: Building2, color: 'bg-blue-500/10 text-blue-600' },
            { label: 'Baru Bulan Ini', value: stats.newThisMonth, icon: Calendar, color: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Total Owner', value: stats.total, icon: Users, color: 'bg-purple-500/10 text-purple-600' },
            { label: 'Aktif', value: stats.total, icon: CheckCircle2, color: 'bg-amber-500/10 text-amber-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-4 rounded-xl border border-border/50 shadow-sm"
            >
              <div className={cn("p-2 rounded-lg mb-3 w-fit", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari cafe berdasarkan nama, alamat, atau owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cafe</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lokasi</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dibuat</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredCafes.map((cafe) => (
                <tr key={cafe.id} className="border-b border-border/30 hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {cafe.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cafe.name}</p>
                        {cafe.cafe_settings?.tagline && (
                          <p className="text-xs text-muted-foreground">{cafe.cafe_settings.tagline}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{cafe.owner?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{cafe.owner?.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{cafe.address || 'No address'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(cafe.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">Aktif</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/dashboard?cafe_id=${cafe.id}`)}
                        className="p-2 rounded-lg hover:bg-muted transition"
                        title="View Dashboard"
                      >
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => router.push(`/settings?cafe_id=${cafe.id}`)}
                        className="p-2 rounded-lg hover:bg-muted transition"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCafes.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada cafe ditemukan</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredCafes.map((cafe) => (
            <motion.div
              key={cafe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card p-4 rounded-xl border border-border/50 shadow-sm"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === cafe.id ? null : cafe.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {cafe.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cafe.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Aktif</span>
                    </div>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                  expandedCard === cafe.id && "rotate-180"
                )} />
              </div>

              <AnimatePresence>
                {expandedCard === cafe.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3 border-t border-border/30 mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{cafe.owner?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{cafe.owner?.email || 'No email'}</p>
                        </div>
                      </div>
                      {cafe.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{cafe.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Dibuat {new Date(cafe.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => router.push(`/dashboard?cafe_id=${cafe.id}`)}
                          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                        >
                          Dashboard
                        </button>
                        <button
                          onClick={() => router.push(`/settings?cafe_id=${cafe.id}`)}
                          className="flex-1 py-2 rounded-lg bg-muted text-foreground text-sm font-medium"
                        >
                          Settings
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {filteredCafes.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada cafe ditemukan</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
