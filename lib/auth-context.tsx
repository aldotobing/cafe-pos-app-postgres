'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

  useEffect(() => {
    checkSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession().then(async (result) => {
          if (result?.expired && !loading) {
            toast.error('Sesi telah berakhir karena tidak aktif. Silakan masuk kembali.', {
              id: 'session-expired',
              duration: 5000,
            });
            await new Promise(r => setTimeout(r, 600));
            router.push('/login');
          } else if (result && !result.expired) {
            mutate(() => true, undefined, { revalidate: true })
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUserData(data.userData);
        return { ...data, expired: false };
      }
      if (response.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          const retryResponse = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setUser(data.user);
            setUserData(data.userData);
            return { ...data, expired: false };
          }
        }
        setUser(null);
        setUserData(null);
        return { expired: true };
      }
      setUser(null);
      setUserData(null);
      return { expired: true };
    } catch {
      return { expired: false };
    } finally {
      setLoading(false);
    }
  };

  const tryRefresh = async (): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    } catch {
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetchClient('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  const signUp = async (email: string, password: string, fullName: string) => {
    setError(null);
    let res: Response;
    try {
      res = await fetchClient('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
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
          keysToRemove.forEach(key => localStorage.removeItem(key));
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
      await fetchClient('/api/auth/logout', { method: 'POST', credentials: 'include' });

      setUser(null);
      setUserData(null);
      setError(null);

      router.push('/login');
      return { success: true };
    } catch (err) {
      const message = err instanceof FetchError
        ? err.message
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
