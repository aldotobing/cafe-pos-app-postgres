'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { User, LogOut, Settings, ChevronDown, Loader2, TriangleAlert, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
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

// ─── Shared modal shell ──────────────────────────────────────────────────────

const iconStyles: Record<string, { bg: string; text: string }> = {
  'amber-500': { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

function ModalShell({
  onClose,
  icon: Icon,
  iconColor,
  title,
  description,
  children,
}: {
  onClose: () => void;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: 'amber-500' | 'destructive';
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const colors = iconStyles[iconColor];

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="bg-card border border-border/60 w-full max-w-sm mx-4 shadow-2xl rounded-3xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.32, 0, 0.67, 0] }}
        >
          <div className="flex flex-col items-center pt-8 pb-2 px-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.05, duration: 0.3, ease: 'backOut' }}
              className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}
            >
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </motion.div>
            <h3 className="font-semibold text-lg text-foreground">{title}</h3>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed max-w-xs">
              {description}
            </p>
          </div>

          <div className="px-6 pb-6 pt-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserDropdown({
  fullName,
  email,
  role,
  avatarUrl,
  onLogout,
  signingOut,
  error,
  onClearError,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showReloadConfirm, setShowReloadConfirm] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onLogout();
    } catch {
      // Logout failed silently
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !showLogoutConfirm &&
        !showReloadConfirm &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
      superadmin: 'Super Admin',
    };
    return labels[role?.toLowerCase()] || role || 'User';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger ──────────────────────────────────────────────────── */}
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
              if (nextSibling) nextSibling.style.display = 'flex';
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

      {/* ── Dropdown ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-popover rounded-xl border border-border/60 shadow-xl z-50 overflow-hidden"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-sm font-semibold text-foreground">{fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{email || 'Email'}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{getRoleLabel(role)}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  setShowReloadConfirm(true);
                }}
              >
                <TriangleAlert size={16} className="text-amber-500" />
                <span>Muat Ulang</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => {
                  toggleTheme();
                  setIsOpen(false);
                }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
              </button>

              <Link
                href="/settings"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors block"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} />
                <span>Pengaturan</span>
              </Link>

              <div className="h-px bg-border/50 mx-3 my-1" />

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                onClick={() => {
                  setIsOpen(false);
                  onClearError?.();
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Force Reload Modal ────────────────────────────────────────── */}
      {showReloadConfirm && (
        <ModalShell
          onClose={() => setShowReloadConfirm(false)}
          icon={TriangleAlert}
          iconColor="amber-500"
          title="Muat Ulang Paksa?"
          description="Sistem akan menghapus cache lokal dan memuat data terbaru dari server."
        >
          <div className="flex items-center gap-3">
            <motion.button
              className="flex-1 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
              onClick={() => setShowReloadConfirm(false)}
              whileTap={{ scale: 0.98 }}
            >
              Batal
            </motion.button>
            <motion.button
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium transition-colors"
              onClick={() => window.location.reload()}
              whileTap={{ scale: 0.98 }}
            >
              Muat Ulang
            </motion.button>
          </div>
        </ModalShell>
      )}

      {/* ── Logout Modal ──────────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <ModalShell
          onClose={() => {
            onClearError?.();
            setShowLogoutConfirm(false);
          }}
          icon={LogOut}
          iconColor="destructive"
          title="Keluar dari Aplikasi?"
          description="Pastikan semua pekerjaan telah selesai sebelum keluar."
        >
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <TriangleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <motion.button
              className="flex-1 py-2.5 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-50 text-sm font-medium transition-colors"
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
              className="flex-1 py-2.5 rounded-xl bg-destructive text-white hover:bg-destructive/85 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              onClick={handleLogout}
              disabled={signingOut}
              whileTap={{ scale: 0.98 }}
            >
              {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              {signingOut ? 'Keluar...' : 'Keluar'}
            </motion.button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
