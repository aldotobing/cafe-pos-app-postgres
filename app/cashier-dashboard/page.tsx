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

  // Check if cashier's account is approved
  if (!userData.is_approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Not Active
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <p className="mb-6 text-gray-600">
              Your cashier account is not active. Please contact your administrator to activate your account.
            </p>
            
            <button
              onClick={signOutUser}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
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