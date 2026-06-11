'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Zap, Mail, Lock, ShieldCheck, CheckCircle2, User, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ErrorMessage, getErrorMessage } from '@/components/ui/error-message';

// ─── Validation ────────────────────────────────────────────────────────────

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
  confirmPassword?: string;
}

function validateForm(
  mode: 'login' | 'signup',
  email: string,
  password: string,
  fullName: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email wajib diisi';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid';
  }

  if (!password) {
    errors.password = 'Password wajib diisi';
  } else if (password.length < 6) {
    errors.password = 'Password minimal 6 karakter';
  }

  if (mode === 'signup') {
    if (!fullName.trim()) {
      errors.fullName = 'Nama lengkap wajib diisi';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Password tidak cocok';
    }
  }

  return errors;
}

// ─── Input field builders ────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-destructive mt-1"
    >
      {message}
    </motion.p>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

function LoginForm() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | React.ReactNode>('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { signUp, signIn } = useAuth();

  const toggleAuthMode = () => {
    setError('');
    setSuccess('');
    setFieldErrors({});
    setConfirmPassword('');
    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'));
  };

  // Focus the first field when mode changes (after AnimatePresence mounts new form)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authMode === 'signup') {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 300); // must exceed the outer AnimatePresence transition (200ms)
  }, [authMode]);

  // ── Demo login ────────────────────────────────────────────────────────

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

  // ── Sign in ───────────────────────────────────────────────────────────

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm('login', email, password, fullName, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');

    try {
      const userData = await signIn(email, password);
      if (!userData.is_approved) {
        throw new Error('pending');
      }
      const targetPath =
        redirectTo !== '/'
          ? redirectTo
          : userData.role === 'cashier'
            ? '/pos'
            : userData.role === 'superadmin'
              ? '/superadmin/users'
              : userData.role === 'admin' && !userData.cafe_id
                ? '/create-cafe'
                : '/';
      router.push(targetPath);
    } catch (err: any) {
      if (err.message === 'pending') {
        setError(
          <span>
            Akun Anda menunggu persetujuan. Silakan hubungi{' '}
            <a
              href={`mailto:aldo_tobing@hotmail.com?subject=Aktivasi Akun Kasirku&body=Halo Admin, saya ingin meminta aktivasi untuk akun saya dengan email: ${email}`}
              className="text-primary hover:underline font-bold"
            >
              administrator
            </a>
            .
          </span>,
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sign up ───────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm('signup', email, password, fullName, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await signUp(email, password, fullName);
      setSuccess('Pendaftaran berhasil! Silakan masuk.');
      setEmail('');
      setPassword('');
      setFullName('');
      setConfirmPassword('');
      // Auto-switch to login after brief delay
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 overflow-hidden selection:bg-primary/25">
      {/* Ambient glow */}
      <motion.div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="w-full max-w-[420px] relative z-10"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card */}
        <div className="bg-card/80 border border-border p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1.5 tracking-tight">
              {authMode === 'login' ? 'Selamat Datang' : 'Buat Akun'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {authMode === 'login' ? 'Masuk ke akun Anda' : 'Daftar untuk mulai menggunakan'}
            </p>
          </div>

          {/* Demo Button (login only) */}
          {authMode === 'login' && (
            <motion.button
              onClick={handleDemoLogin}
              disabled={loading || demoLoading}
              whileHover={{ scale: loading || demoLoading ? 1 : 1.01 }}
              whileTap={{ scale: loading || demoLoading ? 1 : 0.99 }}
              className="w-full mb-6 relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all p-3.5 text-left group disabled:opacity-50"
            >
              <AnimatePresence mode="wait">
                {demoLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 py-1"
                  >
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span className="text-primary text-sm font-medium">Memuat demo...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary font-semibold text-sm">Coba Tanpa Daftar</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-medium tracking-wide">
                          DEMO
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Langsung rasakan pengalaman kasir, kelola stok, dan lihat laporan
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Divider (login only) */}
          {authMode === 'login' && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                atau
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Error / Success banner */}
          <ErrorMessage
            error={error}
            success={success}
            className="mb-5"
            variant="default"
          />

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={authMode}
              initial={{ opacity: 0, y: authMode === 'login' ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: authMode === 'login' ? 4 : -4 }}
              transition={{ duration: 0.2 }}
              onSubmit={authMode === 'login' ? handleSignIn : handleSignup}
              className={`space-y-4 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {/* Full Name (signup only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      ref={nameInputRef}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Nama lengkap Anda"
                      className="pl-10 peer"
                      disabled={loading}
                      aria-invalid={!!fieldErrors.fullName}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary transition-colors pointer-events-none" />
                  </div>
                  <FieldError message={fieldErrors.fullName} />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    ref={emailInputRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="nama@email.com"
                    className="pl-10 peer"
                    disabled={loading}
                    aria-invalid={!!fieldErrors.email}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary transition-colors pointer-events-none" />
                </div>
                <FieldError message={fieldErrors.email} />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {authMode === 'login' && (
                    <a
                      href="mailto:aldo_tobing@hotmail.com?subject=Lupa Password Kasirku"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Lupa password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authMode === 'signup' ? 'Minimal 6 karakter' : '••••••••'}
                    className="pl-10 pr-10 peer"
                    disabled={loading}
                    aria-invalid={!!fieldErrors.password}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary transition-colors pointer-events-none" />
                  <PasswordToggle
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </div>
                <FieldError message={fieldErrors.password} />
              </div>

              {/* Confirm Password (signup only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        // Clear inline error as user types
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi password"
                      className={`pl-10 pr-14 peer ${
                        confirmPassword && password === confirmPassword
                          ? 'border-emerald-500 focus-visible:ring-emerald-500/20'
                          : ''
                      }`}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary transition-colors pointer-events-none" />
                    {confirmPassword && password === confirmPassword && (
                      <CheckCircle2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                    <PasswordToggle
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword ? (
                    <p className="text-xs text-destructive mt-1">Password tidak cocok</p>
                  ) : confirmPassword && password === confirmPassword ? (
                    <p className="text-xs text-emerald-500 mt-1">Password cocok</p>
                  ) : (
                    <FieldError message={fieldErrors.confirmPassword} />
                  )}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{authMode === 'login' ? 'Memproses...' : 'Membuat akun...'}</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Masuk' : 'Daftar'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {authMode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              onClick={toggleAuthMode}
              disabled={loading}
              className="text-primary font-medium hover:text-primary/85 transition-colors ml-1 disabled:opacity-50"
            >
              {authMode === 'login' ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-5">
          Kasirku POS
        </p>
      </motion.div>
    </div>
  );
}

// ─── Export with Suspense ────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
