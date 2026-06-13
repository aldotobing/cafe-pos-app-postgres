"use client"

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const { user, userData, loading, signOutUser } = useAuth();
  const router = useRouter();

  // Handle redirects based on user state
  useEffect(() => {
    if (!loading && user) {
      // If email is confirmed, redirect based on role
      if (userData && userData.email_confirmed) {
        if (userData.role === 'admin' && !userData.cafe_id) {
          router.push('/create-cafe');
        } else {
          router.push('/');
        }
      }
    } else if (!user && !loading) {
      router.push('/login');
    }
  }, [loading, user, userData, router]);

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

  // Show email verification reminder for users who haven't confirmed
  if (userData && !userData.email_confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Verifikasi Email Anda
            </h2>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center space-y-4">
            <p className="text-gray-600">
              Kami telah mengirim link verifikasi ke email Anda. Silakan cek inbox dan folder spam/junk, lalu klik link tersebut untuk mengaktifkan akun.
            </p>
            <p className="text-sm text-muted-foreground">
              Setelah verifikasi, refresh halaman ini untuk melanjutkan.
            </p>

            <button
              onClick={() => {
                signOutUser();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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