'use client';

import { useState, useRef, useEffect, ReactNode, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { ErrorMessage, getErrorMessage } from '@/components/ui/error-message';

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
      setError(getErrorMessage(err));
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
          userData.role === 'superadmin' ? '/superadmin/users' :
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
      } else {
        setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingPhase(null);
    }
  };

  const loadingMessages = authMode === 'login' ? {
    verifying: 'Memverifikasi kredensial...',
    ready: 'Berhasil masuk!'
  } : {
    verifying: 'Membuat akun...',
    ready: 'Pendaftaran berhasil!'
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

      <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center p-6 selection:bg-[var(--gold)] selection:text-[var(--ink)] overflow-hidden">
        {/* Subtle background gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-[var(--ink)] via-[var(--ink-soft)] to-[var(--ink)] pointer-events-none" />

        {/* Ambient glow - more subtle */}
        <motion.div
          className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[var(--gold)]/3 rounded-full blur-[100px] pointer-events-none"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="w-full max-w-[440px] relative z-10"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Card */}
          <div className="bg-[var(--ink-soft)]/80 border border-[var(--line)] p-8 sm:p-10 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-sm">
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && loadingPhase && (
                <motion.div
                  className="absolute inset-0 z-50 bg-[var(--ink-soft)]/90 backdrop-blur-sm flex flex-col items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Simple spinner */}
                  <div className="relative mb-4">
                    <motion.div
                      className="h-10 w-10 rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    {loadingPhase === 'ready' && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </motion.div>
                    )}
                  </div>

                  {/* Loading text */}
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingPhase}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm text-[var(--cream)] text-center"
                    >
                      {loadingMessages[loadingPhase]}
                    </motion.p>
                  </AnimatePresence>
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
                <h1 className="text-3xl font-semibold text-[var(--cream)] mb-2 tracking-tight">
                  {authMode === 'login' ? 'Selamat Datang' : 'Buat Akun'}
                </h1>
                <p className="text-[var(--cream-dim)] text-sm">
                  {authMode === 'login' ? 'Masuk ke akun Anda' : 'Daftar untuk mulai menggunakan'}
                </p>
              </div>

              {/* Demo Account Button */}
              <motion.button
                onClick={handleDemoLogin}
                disabled={loading || demoLoading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="w-full mb-6 relative overflow-hidden rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 hover:bg-[var(--gold)]/10 transition-all p-4 text-left group disabled:opacity-50"
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

              {/* Divider - only show in login mode */}
              {authMode === 'login' && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-[var(--line)]" />
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cream-dim)] font-medium">atau</span>
                  <div className="flex-1 h-px bg-[var(--line)]" />
                </div>
              )}

              {/* Error / Success */}
              <ErrorMessage error={error} success={success} className="mb-5" variant="dark" />

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={authMode}
                  initial={{ opacity: 0, y: authMode === 'login' ? -4 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: authMode === 'login' ? 4 : -4 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={authMode === 'login' ? handleSignIn : handleSignup}
                  className="space-y-5"
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
                          <label className="text-xs font-medium text-[var(--cream-dim)]">Nama Lengkap</label>
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
                              className="w-full bg-black/20 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)]/50 pl-11 pr-4 py-3 rounded-lg focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/20 focus:outline-none transition-all text-sm disabled:opacity-50"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--cream-dim)]">Email</label>
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
                        className="w-full bg-black/20 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)]/50 pl-11 pr-4 py-3 rounded-lg focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/20 focus:outline-none transition-all text-sm disabled:opacity-50"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--cream-dim)]">Password</label>
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
                        className="w-full bg-black/20 border border-[var(--line)] text-[var(--cream)] placeholder:text-[var(--cream-dim)]/50 pl-11 pr-12 py-3 rounded-lg focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/20 focus:outline-none transition-all text-sm disabled:opacity-50"
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
                    className="w-full py-3 mt-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-soft)] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <>
                      <span>{authMode === 'login' ? 'Masuk' : 'Daftar'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  </motion.button>
                </motion.form>
              </AnimatePresence>

              {/* Toggle */}
              <p className="text-center text-sm text-[var(--cream-dim)] mt-6">
                {authMode === 'login' ? "Belum punya akun? " : "Sudah punya akun? "}
                <button
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  }}
                  className="text-[var(--gold)] font-medium hover:text-[var(--gold-soft)] transition-colors ml-1"
                >
                  {authMode === 'login' ? 'Daftar' : 'Masuk'}
                </button>
              </p>
            </motion.div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--cream-dim)]/60 mt-6">
            Kasirku POS
          </p>
        </motion.div>
      </div>

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
