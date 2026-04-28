"use client"

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingApprovalPage() {
  const { user, userData, loading, signOutUser } = useAuth();
  const router = useRouter();

  // Handle redirects based on user state
  useEffect(() => {
    if (!loading && user) {
      // If user is approved, check if they need to create a cafe
      if (userData && userData.is_approved) {
        // If user is an admin and doesn't have a cafe assignment, redirect to create cafe
        if (userData.role === 'admin' && !userData.cafe_id) {
          router.push('/create-cafe');
        }
        // For other approved users (superadmin, cashier with cafe), redirect to dashboard
        else {
          router.push('/');
        }
      }
    } else if (!user && !loading) {
      // If user is not authenticated, redirect to login
      router.push('/login');
    }
  }, [loading, user, userData, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-muted-foreground">Memuat data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show approval pending message for unapproved users who are not superadmin
  if (userData && !userData.is_approved && userData.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Pending Approval
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <p className="mb-6 text-gray-600">
              Your account is currently pending approval. Please contact the administrator at 
              <span className="font-medium text-blue-600"> admin@yourcafe.com </span>
              to complete the approval process.
            </p>
            
            <button
              onClick={() => {
                signOutUser();
              }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show redirecting message
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-muted-foreground">Mengarahkan ke login...</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}