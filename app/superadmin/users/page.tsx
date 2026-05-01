'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from "@/components/app-shell";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Power,
  UserX,
  UserCheck,
  Ban,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email?: string;
  full_name: string;
  role: string;
  is_approved: boolean;
  is_active: boolean;
  trial_start_date?: string;
  trial_end_date?: string;
  auth_type: string;
  created_at: string;
  last_login?: string;
  cafe_id?: number | null;
}

type SortField = 'name' | 'role' | 'status' | 'created';
type SortOrder = 'asc' | 'desc';

const USERS_PER_PAGE = 10;

export default function UserManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [liveUpdateActive, setLiveUpdateActive] = useState(false);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rest/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (userId: string, currentApproval: boolean) => {
    try {
      const response = await fetch(`/api/rest/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !currentApproval ? 1 : 0 })
      });
      if (!response.ok) throw new Error('Failed to update approval');
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_approved: !currentApproval } : user
      ));
      toast.success(currentApproval ? 'Persetujuan dicabut' : 'Pengguna disetujui');
    } catch (err) {
      toast.error('Gagal memperbarui status persetujuan');
    }
  };

  const toggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/rest/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive ? 1 : 0 })
      });
      if (!response.ok) throw new Error('Failed to update active status');
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_active: !currentActive } : user
      ));
      toast.success(currentActive ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan');
    } catch (err) {
      toast.error('Gagal memperbarui status aktif');
    }
  };

  const extendTrial = async (userId: string, currentEndDate?: string) => {
    try {
      const baseDate = currentEndDate && new Date(currentEndDate) > new Date() 
        ? new Date(currentEndDate) 
        : new Date();
      baseDate.setDate(baseDate.getDate() + 30);
      const newEndDate = baseDate.toISOString();

      const response = await fetch(`/api/rest/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial_end_date: newEndDate })
      });
      if (!response.ok) throw new Error('Failed to update trial end date');
      
      setUsers(users.map(user =>
        user.id === userId ? { ...user, trial_end_date: newEndDate } : user
      ));
      toast.success('Trial berhasil diperpanjang 30 hari');
    } catch (err) {
      toast.error('Gagal memperpanjang masa trial');
    }
  };

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) {
      router.push('/dashboard');
      return;
    }
    if (userData?.role === 'superadmin') fetchUsers();
  }, [userData, authLoading, router]);

  // Polling untuk live online status (setiap 30 detik)
  useEffect(() => {
    if (userData?.role !== 'superadmin') return;

    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/superadmin/users/status');
        if (response.ok) {
          const data = await response.json();
          // Update last_login dari users yang ada
          setUsers(prevUsers =>
            prevUsers.map(user => {
              const statusUpdate = data.users.find((s: any) => s.id === user.id);
              if (statusUpdate) {
                return { ...user, last_login: statusUpdate.last_login };
              }
              return user;
            })
          );
          setLiveUpdateActive(true);
        }
      } catch (err) {
        // Silent fail, tidak perlu error toast
        setLiveUpdateActive(false);
      }
    };

    // Initial fetch
    fetchUserStatus();

    // Polling interval
    const interval = setInterval(fetchUserStatus, 30000); // 30 detik

    return () => clearInterval(interval);
  }, [userData?.role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    pending: users.filter(u => !u.is_approved).length,
    active: users.filter(u => u.is_active).length,
    newToday: users.filter(u => {
      const today = new Date().toISOString().split('T')[0];
      return u.created_at?.startsWith(today);
    }).length
  }), [users]);

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'pending' ? !user.is_approved :
        statusFilter === 'active' ? user.is_active :
        !user.is_active;

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = Number(b.is_active) - Number(a.is_active);
          break;
        case 'created':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, searchTerm, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isOnline = (lastLogin?: string) => {
    if (!lastLogin) return false;
    return new Date().getTime() - new Date(lastLogin).getTime() < 5 * 60 * 1000;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
          <p className="text-sm text-muted-foreground animate-pulse">Memuat data pengguna...</p>
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Kelola hak akses dan persetujuan akun</p>
          </div>
          <div className="flex items-center gap-2">
            {liveUpdateActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Live Update</span>
              </div>
            )}
            <button
              onClick={fetchUsers}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'bg-blue-500/10 text-blue-600' },
            { label: 'Pending', value: stats.pending, icon: ShieldAlert, color: 'bg-amber-500/10 text-amber-600' },
            { label: 'Aktif', value: stats.active, icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Baru Hari Ini', value: stats.newToday, icon: UserPlus, color: 'bg-indigo-500/10 text-indigo-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card p-3 rounded-xl border border-border/50 shadow-sm flex items-center gap-3"
            >
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-background border border-border/60 rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition appearance-none cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {filteredAndSortedUsers.length === 0 ? (
            <div className="bg-card border border-dashed rounded-xl p-12 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold">Tidak ada pengguna</h3>
              <p className="text-sm text-muted-foreground mt-1">Coba ubah filter pencarian</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border/50">
                      <tr>
                        <th
                          onClick={() => handleSort('name')}
                          className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            Pengguna
                            <ArrowUpDown className={cn("w-3.5 h-3.5", sortField === 'name' && "text-primary")} />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('role')}
                          className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            Peran
                            <ArrowUpDown className={cn("w-3.5 h-3.5", sortField === 'role' && "text-primary")} />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Login</th>
                        <th
                          onClick={() => handleSort('created')}
                          className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            Terdaftar
                            <ArrowUpDown className={cn("w-3.5 h-3.5", sortField === 'created' && "text-primary")} />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <AnimatePresence mode="popLayout">
                        {paginatedUsers.map((user, index) => (
                          <motion.tr
                            key={user.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-muted/40 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary text-sm border border-primary/20">
                                  {getInitials(user.full_name)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium truncate">{user.full_name}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{user.email || '-'}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-1 rounded-md text-xs font-medium capitalize",
                                user.role === 'superadmin' && "bg-purple-500/10 text-purple-600",
                                user.role === 'admin' && "bg-blue-500/10 text-blue-600",
                                user.role === 'cashier' && "bg-slate-500/10 text-slate-600"
                              )}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    user.is_active ? "bg-emerald-500" : "bg-destructive",
                                    user.is_active && isOnline(user.last_login) && "animate-pulse"
                                  )} />
                                  <span className="text-xs font-medium">
                                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {user.is_approved ? (
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                                  )}
                                  <span className={cn(
                                    "text-xs",
                                    user.is_approved ? "text-emerald-600" : "text-amber-600"
                                  )}>
                                    {user.is_approved ? 'Terverifikasi' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isOnline(user.last_login) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30"
                                  )} />
                                  <span className={cn(
                                    "font-medium",
                                    isOnline(user.last_login) ? "text-emerald-600" : "text-muted-foreground"
                                  )}>
                                    {isOnline(user.last_login) ? 'Online' : user.last_login ? `Aktif ${new Date(user.last_login).toLocaleDateString('id-ID')}` : 'Belum login'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                {user.trial_end_date && (
                                  <span className="text-amber-600">
                                    Trial sampai {new Date(user.trial_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => extendTrial(user.id, user.trial_end_date)}
                                  className="p-2 rounded-lg transition hover:bg-amber-500/10 text-amber-600"
                                  title="Perpanjang Trial 30 Hari"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleApproval(user.id, user.is_approved)}
                                  className={cn(
                                    "p-2 rounded-lg transition",
                                    user.is_approved
                                      ? "hover:bg-muted text-muted-foreground"
                                      : "hover:bg-emerald-500/10 text-emerald-600"
                                  )}
                                  title={user.is_approved ? 'Cabut persetujuan' : 'Setujui'}
                                >
                                  {user.is_approved ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => toggleActive(user.id, user.is_active)}
                                  className={cn(
                                    "p-2 rounded-lg transition",
                                    user.is_active
                                      ? "hover:bg-destructive/10 text-destructive"
                                      : "hover:bg-emerald-500/10 text-emerald-600"
                                  )}
                                  title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  {user.is_active ? <Ban className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {paginatedUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedCard(expandedCard === user.id ? null : user.id)}
                        className="p-4 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary text-sm border border-primary/20 shrink-0">
                            {getInitials(user.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium truncate">{user.full_name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{user.email || '-'}</p>
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-medium capitalize shrink-0",
                                user.role === 'superadmin' && "bg-purple-500/10 text-purple-600",
                                user.role === 'admin' && "bg-blue-500/10 text-blue-600",
                                user.role === 'cashier' && "bg-slate-500/10 text-slate-600"
                              )}>
                                {user.role}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  user.is_active ? "bg-emerald-500" : "bg-destructive"
                                )} />
                                <span className="text-xs text-muted-foreground">
                                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {user.is_approved ? (
                                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {user.is_approved ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isOnline(user.last_login) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30"
                              )} />
                              <span className={cn(
                                "text-xs font-medium",
                                isOnline(user.last_login) ? "text-emerald-600" : "text-muted-foreground"
                              )}>
                                {isOnline(user.last_login) ? 'Online' : user.last_login ? `Aktif ${new Date(user.last_login).toLocaleDateString('id-ID')}` : 'Belum login'}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                            expandedCard === user.id && "rotate-180"
                          )} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedCard === user.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/50 bg-muted/30"
                          >
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Terdaftar</span>
                                  <span>{new Date(user.created_at).toLocaleDateString('id-ID')}</span>
                                </div>
                                {user.trial_end_date && (
                                  <div>
                                    <span className="text-muted-foreground block">Trial Berakhir</span>
                                    <span className="text-amber-600">{new Date(user.trial_end_date).toLocaleDateString('id-ID')}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => extendTrial(user.id, user.trial_end_date)}
                                  className="flex items-center justify-center p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition shrink-0"
                                  title="Perpanjang Trial 30 Hari"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleApproval(user.id, user.is_approved)}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition",
                                    user.is_approved
                                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                                  )}
                                >
                                  {user.is_approved ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  {user.is_approved ? 'Cabut' : 'Setujui'}
                                </button>
                                <button
                                  onClick={() => toggleActive(user.id, user.is_active)}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition",
                                    user.is_active
                                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                  )}
                                >
                                  {user.is_active ? <Ban className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                  {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {paginatedUsers.length} dari {filteredAndSortedUsers.length} pengguna
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}