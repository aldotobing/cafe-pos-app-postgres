'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Important: send cookies
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUserData(data.userData);
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
    const sessionData = await checkSession();
    if (!sessionData || !sessionData.userData) {
      throw new Error('Profil pengguna tidak ditemukan. Silakan hubungi admin atau daftar ulang.');
    }
    return sessionData.userData;
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
    try {
      // 1. Clear localStorage items
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pwa-install-dismissed-at');
          localStorage.removeItem('cart');
          localStorage.removeItem('cafe-settings');
          localStorage.removeItem('cafe-cache');
        }
      } catch (e) {
        // Ignore
      }

      // 2. Clear sessionStorage
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (e) {
        // Ignore
      }

      // 3. Call logout API to clear session cookie
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

      // 4. Clear auth state
      setUser(null);
      setUserData(null);
      setError(null);

      // 5. Small delay to show completion, then redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 6. Redirect to login
      router.push('/login');
      return { success: true };
    } catch (error) {
      // Even if there's an error, clear state and redirect
      setUser(null);
      setUserData(null);
      router.push('/login');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
