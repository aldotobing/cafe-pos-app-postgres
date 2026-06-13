'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/ui/error-message';

type RecoveryState =
  | { phase: 'checking' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

function useRecoverySession(): RecoveryState {
  const [state, setState] = useState<RecoveryState>({ phase: 'checking' });

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const supabase = createClient();

      console.log('[reset-password] URL:', window.location.href);
      console.log('[reset-password] search:', window.location.search);
      console.log('[reset-password] hash:', window.location.hash);

      // PKCE flow: token_hash in query params (modern Supabase)
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = queryParams.get('token_hash');
      const type = queryParams.get('type') || hashParams.get('type');

      // Check for error params in both query and hash
      const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

      // Check for Supabase error params first
      if (errorCode) {
        setState({
          phase: 'error',
          message: errorDescription || `Error: ${errorCode}`,
        });
        return;
      }

      if (tokenHash && type === 'recovery') {
        console.log('[reset-password] PKCE flow detected');
        window.history.replaceState(null, '', '/reset-password');

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (cancelled) return;

        if (error) {
          console.log('[reset-password] verifyOtp error:', error);
          setState({
            phase: 'error',
            message: error.message.includes('expired')
              ? 'Link reset password sudah kadaluarsa. Silakan minta link baru dari halaman login.'
              : `Link reset password tidak valid: ${error.message}`,
          });
        } else {
          console.log('[reset-password] verifyOtp success');
          setState({ phase: 'ready' });
        }
        return;
      }

      // Implicit flow: access_token in URL hash (legacy)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || '';

      console.log('[reset-password] hash params:', Object.fromEntries(hashParams));

      if (accessToken && type === 'recovery') {
        console.log('[reset-password] Implicit flow detected');
        window.history.replaceState(null, '', window.location.pathname);

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (error) {
          console.log('[reset-password] setSession error:', error);
          setState({
            phase: 'error',
            message: `Link reset password tidak valid: ${error.message}`,
          });
        } else {
          console.log('[reset-password] setSession success');
          setState({ phase: 'ready' });
        }
        return;
      }

      console.log('[reset-password] No tokens found in URL, checking existing session');

      // Check if already have a session (proxy may have exchanged cookies)
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        if (session) {
          setState({ phase: 'ready' });
        } else {
          setState({
            phase: 'error',
            message: 'Link reset password tidak valid. Silakan minta link baru dari halaman login.',
          });
        }
      }
    }

    verify();

    return () => { cancelled = true; };
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
  const recoveryState = useRecoverySession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'Gagal memperbarui password.');
        return;
      }

      // Sign out after password change
      await supabase.auth.signOut();

      setSuccess('Password berhasil diperbarui. Silakan masuk dengan password baru.');
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Checking ────────────────────────────────────────────────────────────

  if (recoveryState.phase === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Memverifikasi link reset password...</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────

  if (recoveryState.phase === 'error') {
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
          <p className="text-sm text-muted-foreground mb-6">{recoveryState.message}</p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Kembali ke Login
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────

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

  // ── Password form ───────────────────────────────────────────────────────

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
