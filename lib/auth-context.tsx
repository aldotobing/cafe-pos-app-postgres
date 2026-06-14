'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { fetchClient, FetchError } from '@/lib/fetch-client';
import { mutate } from 'swr';
import { toast } from 'sonner';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string, captchaToken?: string) => Promise<void>;
  signOutUser: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  userData: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Prevent concurrent checkSession() calls — critical for avoiding
  // token-refresh storms when the app wakes up after a long idle period.
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);

  // Check session on mount — Supabase client reads cookies, no network
  useEffect(() => {
    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check on tab focus (e.g., user returns after long idle)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Throttle: don't re-check more than once every 5 seconds
        const now = Date.now();
        if (now - lastCheckRef.current < 5000) return;
        lastCheckRef.current = now;

        checkSession().then(async (result) => {
          if (result?.expired) {
            // Only redirect if we're not already on the login page
            if (window.location.pathname !== '/login') {
              toast.error('Sesi telah berakhir karena tidak aktif. Silakan masuk kembali.', {
                id: 'session-expired',
                duration: 5000,
              });
              await new Promise((r) => setTimeout(r, 600));
              router.push('/login');
            }
          } else if (result && !result.expired) {
            // Session is valid — revalidate SWR data in the background
            mutate(() => true, undefined, { revalidate: true });
          }
          // If result is null (network error), do nothing — keep existing state
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSession = async () => {
    // Prevent concurrent calls
    if (checkingRef.current) return null;
    checkingRef.current = true;

    const controller = new AbortController();
    // Use a longer timeout (12s) to give the browser time to wake up the network
    // after long idle periods, especially on mobile/PWA
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const supabase = createClient();

      // Wrap getSession in a promise race because it can trigger a network
      // token refresh and doesn't accept an AbortSignal directly
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{data: {session: any}}>((_, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        controller.signal.addEventListener('abort', onAbort);
      });
      // Prevent unhandled promise rejection if the race is won by sessionPromise
      timeoutPromise.catch(() => {});

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

      if (!session) {
        // If we had a user before, don't immediately treat as expired —
        // the network may still be waking up. Retry once after a delay.
        if (user) {
          await new Promise((r) => setTimeout(r, 2000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              setUserData(data.userData);
              return { ...data, expired: false };
            }
          }
        }
        setUser(null);
        setUserData(null);
        return { expired: true };
      }

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUserData(data.userData);
        return { ...data, expired: false };
      }

      setUser(null);
      setUserData(null);
      return { expired: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        if (!user) {
          setUser(null);
          setUserData(null);
          return { expired: true };
        }
        // If we have a user but the request timed out (12s), keep the
        // current session — the network is likely still waking up.
        return { expired: false };
      }
      return { expired: false };
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      checkingRef.current = false;
    }
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    setError(null);
    try {
      const res = await fetchClient('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        const error: any = new Error(data.error || 'Login failed');
        error.code = data.code;
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      if (!data.userData) {
        throw new Error('Profil pengguna tidak ditemukan. Silakan hubungi admin atau daftar ulang.');
      }
      setUser(data.user);
      setUserData(data.userData);
      return data.userData;
    } catch (err) {
      if (err instanceof FetchError) {
        throw new Error(err.message);
      }
      throw err;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, captchaToken?: string) => {
    setError(null);
    let res: Response;
    try {
      res = await fetchClient('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, captchaToken }),
        credentials: 'include',
      });
    } catch (networkErr) {
      if (networkErr instanceof FetchError) {
        throw new Error(networkErr.message);
      }
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }

    if (!res.ok) {
      let data: { error?: string; code?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response not JSON
      }

      if (res.status === 0) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      } else if (res.status === 409) {
        throw new Error(data.error || 'Email sudah terdaftar.');
      } else if (res.status === 429) {
        throw new Error(data.error || 'Terlalu banyak percobaan. Coba lagi nanti.');
      } else if (res.status >= 500) {
        throw new Error(data.error || 'Terjadi kesalahan pada server. Silakan coba lagi nanti.');
      } else {
        throw new Error(data.error || 'Gagal membuat akun. Silakan coba lagi.');
      }
    }
    await checkSession();
  };

  const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
    setSigningOut(true);
    try {
      // Clear client-side storage
      try {
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
          localStorage.removeItem('pwa-install-dismissed-at');
          localStorage.removeItem('cart');
          localStorage.removeItem('cafe-settings');
          localStorage.removeItem('cafe-cache');
        }
      } catch {
        // Ignore
      }

      try {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
      } catch {
        // Ignore
      }

      // Call logout API to clear server-side cookies
      const logoutRes = await fetchClient('/api/auth/logout', { method: 'POST', credentials: 'include' });

      if (!logoutRes.ok) {
        const body = await logoutRes.json().catch(() => ({}));
        throw new Error(body.error || 'Gagal logout');
      }

      // Clear all client-side state
      mutate(() => true, undefined, { revalidate: false });
      if (typeof window !== 'undefined') {
        (window as any).__kasirkuClearNotifCache?.();
      }

      setUser(null);
      setUserData(null);
      setError(null);

      // Hard reload to /login for a completely clean slate
      // (clears all in-memory React state, module-level caches, etc.)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { success: true };
    } catch (err) {
      const message =
        err instanceof FetchError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Gagal menghubungi server';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSigningOut(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    signingOut,
    error,
    signIn,
    signUp,
    signOutUser,
    clearError,
    userData,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-muted-foreground font-medium">
              Memuat sesi...
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
