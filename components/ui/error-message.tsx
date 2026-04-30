'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ErrorMessageProps {
  error?: string | React.ReactNode;
  success?: string;
  className?: string;
  variant?: 'default' | 'dark';
}

export function ErrorMessage({ error, success, className = '', variant = 'default' }: ErrorMessageProps) {
  const isDark = variant === 'dark';

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
            isDark
              ? 'bg-red-500/10 border border-red-500/20 text-red-300'
              : 'bg-destructive/10 border border-destructive/20 text-destructive'
          } ${className}`}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            isDark ? 'bg-red-500/20' : 'bg-destructive/20'
          }`}>
            <span className={`text-[10px] font-bold ${isDark ? 'text-red-400' : 'text-destructive'}`}>!</span>
          </div>
          <span className="flex-1">{error}</span>
        </motion.div>
      )}
      {success && (
        <motion.div
          className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
            isDark
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-green-500/10 border border-green-500/20 text-green-700'
          } ${className}`}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${
            isDark ? 'text-emerald-400' : 'text-green-600'
          }`} />
          <span className="flex-1">{success}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to get user-friendly error message
export function getErrorMessage(err: any): string {
  // Custom codes
  if (err?.message === 'pending') {
    return 'Akun Anda menunggu persetujuan. Silakan hubungi administrator.';
  }
  
  if (err?.code === 'ACCOUNT_DISABLED' || err?.message?.includes('dinonaktifkan')) {
    return 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.';
  }
  
  if (err?.code === 'RATE_LIMITED' || err?.status === 429) {
    return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
  }
  
  // HTTP status codes
  if (err?.status === 401 || err?.message?.includes('Invalid credentials') || err?.message?.includes('Email atau password')) {
    return 'Email atau password salah.';
  }
  
  if (err?.status === 403) {
    return 'Akses ditolak. Silakan hubungi admin.';
  }
  
  if (err?.status === 404) {
    return 'Data tidak ditemukan.';
  }
  
  if (err?.status === 409 || err?.message?.includes('already registered') || err?.message?.includes('sudah terdaftar')) {
    return 'Email sudah terdaftar.';
  }
  
  // Server errors
  if (err?.status === 500 || err?.status === 502 || err?.status === 503 || err?.status === 504) {
    return 'Terjadi masalah pada server. Silakan coba lagi nanti.';
  }
  
  // Network errors
  if (err?.status === 0 || err?.message?.includes('network') || err?.message?.includes('koneksi') || err?.message?.includes('fetch')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }
  
  // Fallback
  return err?.message || 'Terjadi kesalahan. Silakan coba lagi.';
}
