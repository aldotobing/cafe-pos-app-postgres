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
  MoreVertical
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

export default function UserManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/rest/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      const usersList = Array.isArray(data) ? data : data.data || [];
      
      setUsers(usersList);
    } catch (err) {
      setError('Gagal mengambil data pengguna');
      toast.error('Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (userId: string, currentApproval: boolean) => {
    try {
      const response = await fetch(`/api/rest/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
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
        headers: { 
          'Content-Type': 'application/json'
        },
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

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'superadmin')) {
      router.push('/dashboard');
      return;
    }

    if (userData && userData.role === 'superadmin') {
      fetchUsers();
    }
  }, [userData, authLoading, router]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      pending: users.filter(u => !u.is_approved).length,
      active: users.filter(u => u.is_active).length,
      newToday: users.filter(u => {
        const today = new Date().toISOString().split('T')[0];
        return u.created_at?.startsWith(today);
      }).length
    };
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'pending' ? !user.is_approved :
        statusFilter === 'active' ? user.is_active :
        statusFilter === 'inactive' ? !user.is_active : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
          />
          <p className="text-muted-foreground animate-pulse">Memuat data pengguna...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
            <p className="text-muted-foreground">Kelola hak akses dan persetujuan akun admin/kasir.</p>
          </div>
          <button 
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm font-medium"
          >
            <Clock className="w-4 h-4" />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Pengguna', value: stats.total, icon: Users, color: 'blue' },
            { label: 'Menunggu', value: stats.pending, icon: ShieldAlert, color: 'amber' },
            { label: 'Akun Aktif', value: stats.active, icon: CheckCircle2, color: 'emerald' },
            { label: 'Daftar Hari Ini', value: stats.newToday, icon: UserPlus, color: 'indigo' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4"
            >
              <div className={`p-2.5 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-600`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Cari nama, email, atau peran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-background border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition min-w-[140px]"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="active">Sedang Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Content */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-card border border-dashed rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">Tidak ada pengguna ditemukan</h3>
              <p className="text-muted-foreground mt-1">Coba gunakan kata kunci pencarian yang berbeda.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-medium italic">
                    <tr>
                      <th className="px-6 py-4">PENGGUNA</th>
                      <th className="px-6 py-4 text-center">PERAN</th>
                      <th className="px-6 py-4">TRIAL / AKTIVITAS</th>
                      <th className="px-6 py-4 text-center">KEAMANAN</th>
                      <th className="px-6 py-4 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <AnimatePresence mode="popLayout">
                      {filteredUsers.map((user) => (
                        <motion.tr 
                          key={user.id} 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">{user.full_name}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email || 'Email tidak tersedia'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const isOnline = user.last_login && (new Date().getTime() - new Date(user.last_login).getTime() < 5 * 60 * 1000);
                                  return (
                                    <>
                                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted-foreground/30'} ${isOnline ? 'animate-pulse' : ''}`} />
                                      <span className={cn("font-medium text-xs", isOnline ? "text-emerald-600" : "text-muted-foreground transition-colors")}>
                                        {isOnline ? 'Online Sekarang' : user.last_login ? `Aktif ${new Date(user.last_login).toLocaleDateString()}` : 'Belum pernah login'}
                                      </span>
                                    </>
                                  )
                                })()}
                              </div>
                              {user.trial_end_date && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Trial ends {new Date(user.trial_end_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                              user.is_approved 
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                              {user.is_approved ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              {user.is_approved ? 'VERIFIED' : 'PENDING'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => toggleApproval(user.id, user.is_approved)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  user.is_approved 
                                    ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                                }`}
                              >
                                {user.is_approved ? 'Revoke Approval' : 'Approve Access'}
                              </button>
                              <button 
                                onClick={() => toggleActive(user.id, user.is_active)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  user.is_active 
                                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/15' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                }`}
                              >
                                {user.is_active ? 'Suspend' : 'Reactive'}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((user) => (
                  <motion.div 
                    key={user.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card p-4 rounded-xl border border-border/60 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground truncate">{user.email || 'Email tidak tersedia'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                        {user.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-tight font-bold">Safe Status</span>
                        <div className="flex items-center gap-2">
                          {user.is_approved ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`text-xs font-bold ${user.is_approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {user.is_approved ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-tight font-bold">Access</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-destructive'}`} />
                          <span className="text-xs font-bold">{user.is_active ? 'Active' : 'Banned'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => toggleApproval(user.id, user.is_approved)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                          user.is_approved 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-emerald-500 text-white shadow-sm'
                        }`}
                      >
                        {user.is_approved ? 'Revoke' : 'Verify'}
                      </button>
                      <button 
                        onClick={() => toggleActive(user.id, user.is_active)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                          user.is_active 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-blue-500 text-white shadow-sm'
                        }`}
                      >
                        {user.is_active ? 'Suspend' : 'Reactive'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}