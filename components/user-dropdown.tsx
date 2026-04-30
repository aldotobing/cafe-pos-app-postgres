'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { User, LogOut, Settings, ChevronDown, Loader2, TriangleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserDropdownProps {
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  onLogout: () => void;
  signingOut?: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export function UserDropdown({ fullName, email, role, avatarUrl, onLogout, signingOut, error, onClearError }: UserDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showReloadConfirm, setShowReloadConfirm] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Closes dropdown after successful logout
    try {
      await onLogout();
    } catch (error) {
      // Logout failed silently
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close dropdown if modal is not showing
      if (!showLogoutConfirm && !showReloadConfirm && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutConfirm, showReloadConfirm]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Owner',
      cashier: 'Kasir',
      superadmin: 'Super Admin'
    };
    return labels[role?.toLowerCase()] || role || 'User';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const nextSibling = target.nextElementSibling as HTMLElement | null;
              if (nextSibling) {
                nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User size={16} className="text-muted-foreground" />
          </div>
        )}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">{fullName || 'User'}</span>
          <span className="text-xs text-muted-foreground">{getRoleLabel(role)}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover rounded-lg shadow-lg border z-50 overflow-hidden">
          {/* User Info */}
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">{fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{email || 'Email'}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{getRoleLabel(role)}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              onClick={() => {
                setIsOpen(false);
                setShowReloadConfirm(true);
              }}
            >
              <TriangleAlert size={16} className="text-amber-500" />
              <span>Muat Ulang</span>
            </button>

            <Link
              href="/settings"
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors block"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={16} />
              <span>Pengaturan</span>
            </Link>

            <div className="h-px bg-border mx-3 my-1" />

            <button
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              onClick={() => {
                onClearError?.();
                setIsOpen(false);
                setShowLogoutConfirm(true);
              }}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              <span>{signingOut ? 'Keluar...' : 'Keluar'}</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Force Reload Confirmation Modal */}
      {showReloadConfirm &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <motion.div
                className="bg-card border rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.25, ease: [0.32, 0, 0.67, 0] }}
              >
                {/* Icon Header */}
                <div className="flex flex-col items-center pt-6 pb-4 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: "backOut" }}
                    className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3"
                  >
                    <TriangleAlert className="h-5 w-5 text-amber-500" />
                  </motion.div>
                  <h3 className="font-semibold text-base text-center">Muat Ulang Paksa?</h3>
                  <p className="text-muted-foreground text-sm text-center mt-1.5 leading-relaxed">
                    Sistem akan menghapus semua cache lokal dan memuat ulang data terbaru dari server.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-border mx-6" />

                {/* Actions */}
                <div className="flex items-center gap-3 p-4">
                  <motion.button
                    className="flex-1 px-4 py-2.5 rounded-lg border bg-background hover:bg-accent text-sm font-medium transition-colors"
                    onClick={() => setShowReloadConfirm(false)}
                    whileTap={{ scale: 0.98 }}
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    onClick={() => {
                      window.location.reload();
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Muat Ulang
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      }
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <motion.div
                className="bg-card border rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.25, ease: [0.32, 0, 0.67, 0] }}
              >
                {/* Icon Header */}
                <div className="flex flex-col items-center pt-6 pb-4 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: "backOut" }}
                    className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3"
                  >
                    <LogOut className="h-5 w-5 text-destructive" />
                  </motion.div>
                  <h3 className="font-semibold text-base text-center">Keluar dari Aplikasi?</h3>
                  <p className="text-muted-foreground text-sm text-center mt-1.5 leading-relaxed">
                    {signingOut
                      ? 'Keluar dari sesi...'
                      : 'Pastikan semua pekerjaan Anda telah selesai sebelum keluar.'}
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mx-6 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {signingOut && (
                  <div className="mx-6 mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menutup sesi...</span>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-border mx-6" />

                {/* Actions */}
                <div className="flex items-center gap-3 p-4">
                  <motion.button
                    className="flex-1 px-4 py-2.5 rounded-lg border bg-background hover:bg-accent disabled:opacity-50 text-sm font-medium transition-colors"
                    onClick={() => {
                      onClearError?.();
                      setShowLogoutConfirm(false);
                    }}
                    disabled={signingOut}
                    whileTap={{ scale: 0.98 }}
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    onClick={handleLogout}
                    disabled={signingOut}
                    whileTap={{ scale: 0.98 }}
                  >
                    {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                    {signingOut ? 'Keluar...' : 'Keluar'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      }
    </div>
  );
}
