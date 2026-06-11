'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/ui/error-message';

type RecoveryTokens = { access_token: string; refresh_token: string } | null;

function useRecoveryTokens(): { tokens: RecoveryTokens; checking: boolean; error: string } {
  const [state, setState] = useState<{ tokens: RecoveryTokens; checking: boolean; error: string }>({
    tokens: null,
    checking: true,
    error: '',
  });

  useEffect(() => {
    // Extract tokens from email link hash: #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    const type = hashParams.get('type');
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || '';

    if (access_token && type === 'recovery') {
      // Clean the URL
      window.history.replaceState(null, '', window.location.pathname);
      setState({ tokens: { access_token, refresh_token }, checking: false, error: '' });
    } else {
      setState({
        tokens: null,
        checking: false,
        error: 'Link reset password tidak valid. Silakan minta link baru dari halaman login.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { tokens, checking, error: tokenError } = useRecoveryTokens();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (!tokens) {
      setError('Token reset tidak ditemukan. Silakan minta link baru.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal memperbarui password.');
        return;
      }

      setSuccess(data.message);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Checking state ────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Memeriksa link...</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] bg-card/80 border border-border p-8 rounded-2xl shadow-xl text-center"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Link Tidak Valid</h2>
          <p className="text-sm text-muted-foreground mb-6">{tokenError}</p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Kembali ke Login
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] bg-card/80 border border-border p-8 rounded-2xl shadow-xl text-center"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Password Diperbarui</h2>
          <p className="text-sm text-muted-foreground mb-4">{success}</p>
          <p className="text-xs text-muted-foreground/60">Mengalihkan ke halaman login...</p>
        </motion.div>
      </div>
    );
  }

  // ── Password form ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="w-full max-w-[400px] relative z-10"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="bg-card/80 border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-semibold text-foreground mb-1.5 tracking-tight">
              Buat Password Baru
            </h1>
            <p className="text-muted-foreground text-sm">
              Masukkan password baru untuk akun Anda
            </p>
          </div>

          <ErrorMessage error={error} className="mb-5" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  className="pl-10 pr-10 peer"
                  disabled={loading}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary transition-colors pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memperbarui...</span>
                </>
              ) : (
                <>
                  <span>Simpan Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-5">Kasirku POS</p>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
