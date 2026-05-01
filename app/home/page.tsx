'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.push('/login');
      } else if (userData) {
        // User exists, redirect based on role
        if (userData.role === 'cashier') {
          router.push('/cashier-dashboard');
        } else if (userData.role === 'superadmin') {
          router.push('/superadmin/users');
        } else {
          // Regular admin
          router.push('/admin-dashboard');
        }
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Redirecting...</div>
    </div>
  );
}