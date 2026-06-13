'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  MapPin,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

function useRedirectGuard() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !userData) { router.push('/login'); return; }
    if (userData.role !== 'admin' && userData.role !== 'superadmin') { router.push('/'); return; }
    if (userData.role === 'admin' && userData.cafe_id) { router.push('/dashboard'); return; }
  }, [loading, user, userData, router]);

  return { user, userData, loading };
}

export default function CreateCafePage() {
  const { user, userData, loading } = useRedirectGuard();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'form' | 'submitting' | 'done'>('form');

  useEffect(() => { nameRef.current?.focus(); }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nama bisnis wajib diisi';
    else if (form.name.trim().length < 2) e.name = 'Nama minimal 2 karakter';
    if (!form.address.trim()) e.address = 'Alamat wajib diisi';
    if (!form.phone.trim()) e.phone = 'Nomor telepon wajib diisi';
    else if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) e.phone = 'Format nomor telepon tidak valid';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setSubmitting(true);
    setStep('submitting');

    try {
      if (!userData?.id) throw new Error('User data not found');

      const res = await fetch('/api/cafes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, address: form.address, phone: form.phone }),
      });

      if (!res.ok) throw new Error('Gagal membuat bisnis');
      const { cafeId } = await res.json();

      const updateRes = await fetch(`/api/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafe_id: Number(cafeId), updated_at: new Date().toISOString() }),
      });

      if (!updateRes.ok) throw new Error('Gagal menghubungkan bisnis ke akun');

      setStep('done');
      setSuccess(true);
      toast.success('Bisnis berhasil dibuat!');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat bisnis');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-primary/30 border-t-primary"
        />
      </div>
    );
  }

  if (!user || !userData || (userData.role !== 'admin' && userData.role !== 'superadmin') || (userData.role === 'admin' && userData.cafe_id)) return null;

  // ── Success ──────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold">Bisnis Berhasil Dibuat!</h2>
          <p className="text-muted-foreground">Mengalihkan ke dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          className="w-full max-w-lg relative z-10"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Card */}
          <div className="bg-card border border-border/60 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5"
              >
                <Building2 className="w-7 h-7 text-primary" />
              </motion.div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Buat Bisnis Baru
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                Isi detail bisnis Anda untuk memulai menggunakan KasirKu
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8 sm:pb-10">
              {/* Error banner */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-5 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fields */}
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
                {/* Name */}
                <motion.div variants={fadeInUp} transition={{ delay: 0.15 }}>
                  <label htmlFor="name" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Nama Bisnis <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      ref={nameRef}
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Contoh: Kedai Kopi Nusantara"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                        errors.name
                          ? 'border-destructive/60 focus:ring-destructive/20'
                          : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1 ml-1">{errors.name}</p>
                  )}
                </motion.div>

                {/* Address */}
                <motion.div variants={fadeInUp} transition={{ delay: 0.2 }}>
                  <label htmlFor="address" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Alamat Lengkap <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <textarea
                      id="address"
                      required
                      rows={2}
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      placeholder="Jl. Sudirman No. 1, Jakarta Pusat"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all resize-none ${
                        errors.address
                          ? 'border-destructive/60 focus:ring-destructive/20'
                          : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-xs text-destructive mt-1 ml-1">{errors.address}</p>
                  )}
                </motion.div>

                {/* Phone */}
                <motion.div variants={fadeInUp} transition={{ delay: 0.25 }}>
                  <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Nomor Telepon <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="0812-3456-7890"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                        errors.phone
                          ? 'border-destructive/60 focus:ring-destructive/20'
                          : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1 ml-1">{errors.phone}</p>
                  )}
                </motion.div>
              </motion.div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-7"
              >
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat Bisnis...
                    </>
                  ) : (
                    <>
                      Buat Bisnis
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/50 mt-5">
            KasirKu POS &copy; {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
