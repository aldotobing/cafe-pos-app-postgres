'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function CashierDashboard() {
  const { user, userData, loading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    // Redirect if user is not a cashier
    if (userData && userData.role !== 'cashier') {
      router.push('/admin-dashboard');
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'cashier') {
    return null; // The redirect happens in the useEffect
  }

  // Redirect cashiers to POS page since that's where they should be
  useEffect(() => {
    if (!loading && user && userData && userData.role === 'cashier') {
      router.push('/pos');
    }
  }, [user, userData, loading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-2xl font-semibold">Redirecting to POS...</div>
    </div>
  );
}