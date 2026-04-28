'use client';

import { useState, useRef, useEffect, ReactNode, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

type LoadingPhase = 'verifying' | 'ready' | null;

function LoginForm() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | ReactNode>('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { signUp, signIn } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const simulatePhases = async (callback: () => Promise<void>) => {
    setLoadingPhase('verifying');
    await new Promise(r => setTimeout(r, 600));
    await callback();
    setLoadingPhase('ready');
    await new Promise(r => setTimeout(r, 400));
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');

    try {
      const userData = await signIn('demo@kasirku.biz.id', 'akundemo');

      if (!userData.is_approved) {
        setError('Akun demo sedang tidak aktif. Silakan gunakan akun pribadi.');
        setDemoLoading(false);
        return;
      }


      router.push(redirectTo);
    } catch (err: any) {
      setError('Gagal masuk ke akun demo. Silakan coba lagi.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await simulatePhases(async () => {
        const userData = await signIn(email, password);

        if (!userData.is_approved) {
          throw new Error('pending');
        }


        // Redirect ke halaman asli atau default berdasarkan role
        const targetPath = redirectTo !== '/' ? redirectTo : 
          userData.role === 'cashier' ? '/pos' :
          userData.role === 'superadmin' ? '/superadmin/user-management' :
          userData.role === 'admin' && !userData.cafe_id ? '/create-cafe' : '/';
        router.push(targetPath);
      });
    } catch (err: any) {
      if (err.message === 'pending') {
        setError(
          <span>
            Akun Anda menunggu persetujuan. Silakan hubungi{' '}
            <a 
              href={`mailto:aldo_tobing@hotmail.com?subject=Aktivasi Akun Kasirku&body=Halo Admin, saya ingin meminta aktivasi untuk akun saya dengan email: ${email}`}
              className="text-[var(--gold)] hover:underline font-bold"
            >
              administrator
            </a>.
          </span>
        );
      } else if (err.code === 'ACCOUNT_DISABLED' || err.message?.includes('dinonaktifkan')) {
        setError('Akun Anda telah dinonaktifkan. Silakan hubungi admin.');
      } else {
        // Tampilkan pesan error asli jika ada, atau fallback ke pesan default
        setError(err.message || 'Email atau password salah');
      }
      setLoading(false);
      setLoadingPhase(null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await simulatePhases(async () => {
        await signUp(email, password, fullName);
        setSuccess('Pendaftaran berhasil! Akun Anda sedang diproses.');
        setEmail('');
        setPassword('');
        setFullName('');
      });
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
      setLoadingPhase(null);
    }
  };

  const loadingMessages = {
    verifying: 'Memverifikasi kredensial...',
    ready: 'Berhasil masuk!'
  };

  return (
    <>
      <style>{`
        :root {
          --ink:      #181815;
          --ink-soft: #232320;
          --cream:    #EDECE8;
          --cream-soft: #C5C4C0;
          --cream-dim:#8A8985;
          --gold:     #D4AF37;
          --gold-soft: #F4CF57;
          --line:     rgba(255,255,255,0.08);
        }
      `}</style>

      <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center p-4 selection:bg-[var(--gold)] selection:text-[var(--ink)] overflow-hidden">
        {/* Background grain */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.035, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

        {/* Ambient glow */}
        <motion.div
          className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--gold)]/5 rounded-full blur-[120px] pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="w-full max-w-[440px] relative z-10"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Card */}
          <div className="bg-[var(--ink-soft)] border border-[var(--line)] p-8 sm:p-10 rounded-[32px] shadow-2xl relative overflow-hidden">
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && loadingPhase && (
                <motion.div
                  className="absolute inset-0 z-50 bg-[var(--ink-soft)]/95 backdrop-blur-sm flex flex-col items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Animated ring */}
                  <div className="relative mb-6">
                    {/* Outer glow ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[var(--gold)]/20"
                      animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                    {/* Middle ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border border-[var(--gold)]/30"
                      animate={{ scale: [1, 1.15], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                    />
                    {/* Spinner */}
                    <div className="h-16 w-16 rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)] flex items-center justify-center"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      {loadingPhase === 'ready' ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
                      )}
                    </div>
                  </div>

                  {/* Loading text */}
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingPhase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium text-[var(--cream)] text-center"
                    >
                      {loadingMessages[loadingPhase]}
                    </motion.p>
                  </AnimatePresence>

                  {/* Progress dots */}
                  <div className="flex items-center gap-2 mt-4">
                    {(['verifying', 'ready'] as const).map((phase, i) => {
                      const phases = ['verifying', 'ready'];
                      const currentIndex = phases.indexOf(loadingPhase);
                      const isActive = i <= currentIndex;
                      return (
                        <motion.div
                          key={phase}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isActive ? 'w-6 bg-[var(--gold)]' : 'w-1.5 bg-[var(--line)]'
                          }`}
                          initial={false}
                          animate={{
                            width: isActive ? 24 : 6,
                            backgroundColor: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.08)'
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content - blurred when loading */}
            <motion.div
              className={loading ? 'pointer-events-none' : ''}
              style={{ filter: loading ? 'blur(2px)' : 'none' }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-['Playfair_Display',serif] text-4xl font-bold text-[var(--cream)] mb-3">Welcome Back</h1>
                <p className="text-[var(--cream-dim)] text-base font-normal">Masuk sesuai role Anda</p>
              </div>

              {/* Demo Account Button */}
              <motion.button
                onClick={handleDemoLogin}
                disabled={loading || demoLoading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="w-full mb-7 relative overflow-hidden rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 hover:bg-[var(--gold)]/8 transition-all p-4 text-left group disabled:opacity-50"
              >
                <AnimatePresence mode="wait">
                  {demoLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative flex items-center justify-center gap-3 py-2"
                    >
                      <Loader2 className="h-4 w-4 text-[var(--gold)] animate-spin" />
                      <span className="text-[var(--gold)] text-sm font-medium">Memuat demo...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative flex items-start gap-3"
                    >
                      <div className="p-2.5 rounded-xl bg-[var(--gold)]/12 shrink-0">
                        <Zap className="h-4 w-4 text-[var(--gold)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[var(--gold)] font-semibold text-sm">Coba Tanpa Daftar</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold)]/12 text-[var(--gold)]/70 font-medium tracking-wide">DEMO</span>
                        </div>
                        <p className="text-[11px] text-[var(--cream-dim)] leading-relaxed">Langsung rasakan pengalaman kasir, kelola stok, dan lihat laporan</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[var(--line)]" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--cream-dim)] font-medium">atau</span>
                <div className="flex-1 h-px bg-[var(--line)]" />
              </div>

              {/* Error / Success */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-start gap-2.5"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                  >
                    <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-red-400 text-[10px] font-bold">!</span>
                    </div>
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-300 flex items-start gap-2.5"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={authMode}
                  initial={{ opacity: 0, x: authMode === 'login' ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: authMode === 'login' ? 8 : -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={authMode === 'login' ? handleSignIn : handleSignup}
                  className="space-y-4"
                >
                  <AnimatePresence>
                    {authMode === 'signup' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cream-dim)] ml-1">Nama Lengkap</label>
                          <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'fullname' ? 'text-[var(--gold)]' : 'text-[var(--cream-dim)]'}`} />
                            <input
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              onFocus={() => setFocusedField('fullname')}
                              onBlur={() => setFocusedField(null)}
                              required
                              type="text"
                              placeholder="Nama lengkap Anda"
                              className="w-full bg-black/30 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)] pl-11 pr-4 py-3.5 rounded-xl focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] focus:outline-none transition-all text-sm disabled:opacity-50"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cream-dim)] ml-1">Alamat Email</label>
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'email' ? 'text-[var(--gold)]' : 'text-[var(--cream-dim)]'}`} />
                      <input
                        ref={emailRef}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        type="email"
                        placeholder="nama@email.com"
                        className="w-full bg-black/30 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)] pl-11 pr-4 py-3.5 rounded-xl focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] focus:outline-none transition-all text-sm disabled:opacity-50"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cream-dim)] ml-1">Kata Sandi</label>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-[var(--gold)]' : 'text-[var(--cream-dim)]'}`} />
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full bg-black/30 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)] pl-11 pr-12 py-3.5 rounded-xl focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] focus:outline-none transition-all text-sm disabled:opacity-50"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--cream-dim)] hover:text-[var(--cream)] transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    disabled={loading}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    type="submit"
                    className="w-full py-3.5 mt-2 bg-[var(--gold)] text-black font-bold rounded-xl hover:bg-[var(--gold-soft)] transition-all text-sm shadow-lg shadow-[var(--gold)]/10 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <>
                      <span>{authMode === 'login' ? 'Masuk' : 'Daftar'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  </motion.button>
                </motion.form>
              </AnimatePresence>

              {/* Toggle */}
              <p className="text-center text-sm text-[var(--cream-dim)] mt-8">
                {authMode === 'login' ? "Belum punya akun? " : "Sudah punya akun? "}
                <button
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  }}
                  className="text-[var(--gold)] font-semibold hover:text-[var(--gold-soft)] transition-colors ml-1"
                >
                  {authMode === 'login' ? 'Daftar Sekarang' : 'Masuk Sekarang'}
                </button>
              </p>
            </motion.div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[var(--cream-dim)] mt-6">
            © 2026 Kasirku — POS System
          </p>
        </motion.div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// Export dengan Suspense untuk handle useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#181815] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
