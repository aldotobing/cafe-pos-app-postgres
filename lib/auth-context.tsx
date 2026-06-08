'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
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
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkSession();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const scheduleRefresh = (expiresAt: number | null) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!expiresAt) return;

    const now = Date.now() / 1000;
    const refreshAt = expiresAt - 300; // 5 minutes before expiry
    const delay = Math.max(0, (refreshAt - now) * 1000);

    if (delay <= 0) {
      refreshSession();
      return;
    }

    refreshTimerRef.current = setTimeout(() => refreshSession(), delay);
  };

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser((prev: any) => prev?.id === data.user.id ? { ...prev, ...data.user } : prev);
        }
        scheduleRefresh(data.expires_at);
      } else {
        setUser(null);
        setUserData(null);
        router.push('/login');
      }
    } catch {
      refreshTimerRef.current = setTimeout(() => refreshSession(), 2 * 60 * 1000);
    }
  };

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUserData(data.userData);
        scheduleRefresh(data.expires_at);
        return data;
      } else {
        setUser(null);
        setUserData(null);
        return null;
      }
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important: receive cookies
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
    scheduleRefresh(data.session?.expires_at ?? null);
    return data.userData;
  };


  const signUp = async (email: string, password: string, fullName: string) => {
    setError(null);
    let res: Response;
    try {
      res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
        credentials: 'include', // Important: receive cookies
      });
    } catch (networkErr) {
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
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    try {
      // 1. Sign out from Supabase client (clears browser-stored session)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Ignore — client may not have a session if auth is cookie-only
      }

      // 2. Clear all Supabase-managed localStorage keys (sb-*)
      try {
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          localStorage.removeItem('pwa-install-dismissed-at');
          localStorage.removeItem('cart');
          localStorage.removeItem('cafe-settings');
          localStorage.removeItem('cafe-cache');
        }
      } catch (e) {
        // Ignore
      }

      // 3. Clear sessionStorage
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (e) {
        // Ignore
      }

      // 4. Call logout API to clear server-side cookies
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

      // 5. Clear auth state
      setUser(null);
      setUserData(null);
      setError(null);

      // 6. Redirect to login
      router.push('/login');
      return { success: true };
    } catch (err) {
      const isNetworkError = err instanceof TypeError && (
        err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.'
      );
      const message = isNetworkError
        ? 'Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.'
        : (err instanceof Error ? err.message : 'Gagal menghubungi server');
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
      {!loading && children}
    </AuthContext.Provider>
  );
}
