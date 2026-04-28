'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function CreateStore() {
  const { user, userData, loading } = useAuth();
  const [storeData, setStoreData] = useState({ name: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !userData) {
        router.push('/login');
        return;
      }
      if (userData.role !== 'admin' && userData.role !== 'superadmin') {
        router.push('/');
        return;
      }
      if (userData.role === 'admin' && userData.cafe_id) {
        router.push('/');
        return;
      }
    }
  }, [loading, user, userData, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181815]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!user || !userData || (userData.role !== 'admin' && userData.role !== 'superadmin') || (userData.role === 'admin' && userData.cafe_id)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (!userData?.id) throw new Error('User data not found');

      const response = await fetch('/api/cafes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeData.name,
          address: storeData.address,
          phone: storeData.phone,
        }),
      });

      if (!response.ok) throw new Error('Gagal membuat bisnis');
      const result = await response.json();
      const cafeId = result.cafeId;

      const updateRes = await fetch(`/api/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafe_id: Number(cafeId), updated_at: new Date().toISOString() }),
      });

      if (!updateRes.ok) throw new Error('Gagal menghubungkan bisnis');

      setSuccess(true);
      setTimeout(() => window.location.href = '/', 1000);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat bisnis.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181815]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="h-16 w-16 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] flex items-center justify-center mx-auto mb-6" style={{ animation: 'spin 1s linear infinite' }}>
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-[#EDECE8]">Bisnis Berhasil Dibuat</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181815] flex items-center justify-center p-4 selection:bg-[#D4AF37] selection:text-[#181815] overflow-hidden relative">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Background grain */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.035, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

      {/* Ambient glow */}
      <motion.div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="w-full max-w-[440px] relative z-10"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="bg-[#232320] border border-white/5 p-10 rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="text-center mb-10">
            <h1 className="font-['Playfair_Display',serif] text-4xl font-bold text-[#EDECE8] mb-3">Siapkan Bisnis</h1>
            <p className="text-[#8A8985] text-base">Detail dasar untuk memulai</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-start gap-2.5"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-[10px] font-bold">!</span>
                  </div>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8985] ml-1">Nama Bisnis</label>
              <input
                required
                value={storeData.name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setStoreData({...storeData, name: e.target.value})}
                className="w-full bg-black/30 border border-white/5 text-[#EDECE8] placeholder:text-[#8A8985]/40 px-5 py-4 rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                placeholder="Contoh: Toko Sejahtera"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8985] ml-1">Alamat Lengkap</label>
              <input
                required
                value={storeData.address}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setStoreData({...storeData, address: e.target.value})}
                className="w-full bg-black/30 border border-white/5 text-[#EDECE8] placeholder:text-[#8A8985]/40 px-5 py-4 rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                placeholder="Jl. Sudirman No. 1, Jakarta"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8985] ml-1">Nomor Telepon</label>
              <input
                required
                type="tel"
                value={storeData.phone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setStoreData({...storeData, phone: e.target.value})}
                className="w-full bg-black/30 border border-white/5 text-[#EDECE8] placeholder:text-[#8A8985]/40 px-5 py-4 rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                placeholder="08123456789"
              />
            </div>

            <motion.button
              disabled={isSubmitting}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              type="submit"
              className="w-full py-4 mt-6 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#F4CF57] transition-all text-sm shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin h-4 w-4" /> <span>Menyimpan...</span></>
              ) : (
                <>
                  <span>Lanjutkan</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>
        </div>
        <p className="text-center text-[11px] text-[#8A8985] mt-6">
          © 2026 Kasirku — POS System
        </p>
      </motion.div>
    </div>
  );
}