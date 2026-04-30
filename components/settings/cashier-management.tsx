"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, Loader2, CheckCircle2, AlertCircle, Plus, X, UserX, UserCheck, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SectionCard } from "./section-card"
import { SettingsField, SettingsInput } from "./settings-field"

interface Cashier {
  id: string
  email: string
  full_name: string
  role: string
  is_active: number | boolean
  created_at: string
}

interface CashierManagementProps {
  userId: string | undefined
  cafeId: number | null
}

export function CashierManagement({ userId, cafeId }: CashierManagementProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({})
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'activate' | 'deactivate'
    cashierId: string | null
    cashierName: string
  }>({ isOpen: false, type: 'deactivate', cashierId: null, cashierName: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  }

  // Fetch cashiers list
  const fetchCashiers = async () => {
    if (!cafeId) return

    try {
      const response = await fetch(`/api/rest/users?role=cashier&cafe_id=${cafeId}`)
      if (response.ok) {
        const result = await response.json()
        // API returns { data: [], meta: {} }
        const data = result.data || (Array.isArray(result) ? result : [])
        setCashiers(data)
      }
    } catch (error) {
      console.error('Error fetching cashiers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCashiers()
  }, [cafeId])

  const openDeactivateDialog = (cashier: Cashier) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deactivate',
      cashierId: cashier.id,
      cashierName: cashier.full_name
    })
  }

  const openActivateDialog = (cashier: Cashier) => {
    setConfirmDialog({
      isOpen: true,
      type: 'activate',
      cashierId: cashier.id,
      cashierName: cashier.full_name
    })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, type: 'deactivate', cashierId: null, cashierName: '' })
  }

  const handleConfirmAction = async () => {
    if (!confirmDialog.cashierId) return

    setIsProcessing(true)
    const isActive = confirmDialog.type === 'activate' ? 1 : 0

    try {
      const response = await fetch(`/api/rest/users/${confirmDialog.cashierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (response.ok) {
        const actionText = confirmDialog.type === 'activate' ? 'diaktifkan' : 'dinonaktifkan'
        setMessage({ type: 'success', text: `Kasir berhasil ${actionText}!` })
        fetchCashiers() // Refresh list
      } else {
        const actionText = confirmDialog.type === 'activate' ? 'mengaktifkan' : 'menonaktifkan'
        setMessage({ type: 'error', text: `Gagal ${actionText} kasir.` })
      }
    } catch (error) {
      const actionText = confirmDialog.type === 'activate' ? 'mengaktifkan' : 'menonaktifkan'
      setMessage({ type: 'error', text: `Terjadi kesalahan saat ${actionText} kasir.` })
    } finally {
      setIsProcessing(false)
      closeConfirmDialog()
    }
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {}
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Nama lengkap wajib diisi'
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format email tidak valid'
    }
    
    if (!password) {
      newErrors.password = 'Password wajib diisi'
    } else if (password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createCashier = async () => {
    if (!validateForm() || !cafeId) {
      if (!cafeId) {
        setMessage({ type: 'error', text: 'Pastikan kafe sudah dibuat terlebih dahulu.' })
      }
      return
    }

    setIsCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/create-cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, cafeId }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `Kasir berhasil dibuat! Password: ${password}` })
        setEmail('')
        setPassword('')
        setFullName('')
        fetchCashiers() // Refresh list
      } else {
        setMessage({ type: 'error', text: result.error || 'Gagal membuat kasir.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat membuat kasir.' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <SectionCard
      title="Manajemen Kasir"
      description="Buat dan kelola akun kasir untuk toko Anda"
      icon={Users}
      delay={0.08}
    >
      {/* Add Button */}
      <div className="flex justify-end mb-4">
        <motion.button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm font-medium"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.05 }}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              <span>Tutup Form</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Tambah Kasir</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Form - Hidden by default */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/30 rounded-xl p-4 sm:p-5 mb-4 border">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Informasi Kasir Baru
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }))
                    }}
                    placeholder="Masukkan nama lengkap"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-input focus:border-primary'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    placeholder="kasir@example.com"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-input focus:border-primary'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">
                    Password <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground font-normal ml-1">(minimal 6 karakter)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                      }}
                      placeholder="Buat password yang aman"
                      className={`w-full px-3 py-2.5 pr-10 rounded-lg border bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        errors.password ? 'border-red-500 focus:border-red-500' : 'border-input focus:border-primary'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-5 pt-4 border-t">
                <motion.button
                  onClick={createCashier}
                  disabled={isCreating}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                  whileHover={!isCreating ? { scale: 1.01 } : {}}
                  whileTap={!isCreating ? { scale: 0.99 } : {}}
                  transition={{ duration: 0.05 }}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Membuat Akun...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Buat Akun Kasir</span>
                    </>
                  )}
                </motion.button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Kasir akan dapat login menggunakan email dan password di atas
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cashiers List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Daftar Kasir ({cashiers.length})
        </h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : cashiers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Belum ada kasir. Klik tombol + untuk menambahkan.
          </div>
        ) : (
          <div className="space-y-2">
            {cashiers.map((cashier) => (
              <motion.div
                key={cashier.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  cashier.is_active === true || cashier.is_active === 1
                    ? 'bg-background/50 hover:bg-background'
                    : 'bg-muted/30 opacity-70'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${cashier.is_active !== true && cashier.is_active !== 1 && 'text-muted-foreground'}`}>
                    {cashier.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{cashier.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {cashier.is_active === true || cashier.is_active === 1 ? (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Aktif
                      </span>
                      <motion.button
                        onClick={() => openDeactivateDialog(cashier)}
                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Nonaktifkan kasir"
                      >
                        <UserX className="h-4 w-4" />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        Nonaktif
                      </span>
                      <motion.button
                        onClick={() => openActivateDialog(cashier)}
                        className="p-1.5 rounded-md hover:bg-green-100 text-green-600 dark:hover:bg-green-900/30"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Aktifkan kasir"
                      >
                        <UserCheck className="h-4 w-4" />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            className={`mt-3 flex items-center gap-2 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="flex-1 break-all">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <h3 className="font-semibold text-lg mb-2">
                {confirmDialog.type === 'activate' ? 'Konfirmasi Aktivasi' : 'Konfirmasi Penonaktifan'}
              </h3>
              <p className="text-muted-foreground mb-6">
                Apakah Anda yakin ingin {confirmDialog.type === 'activate' ? 'mengaktifkan' : 'menonaktifkan'} kasir{' '}
                <span className="font-medium text-foreground">{confirmDialog.cashierName}</span>?
              </p>
              <div className="flex justify-end gap-2">
                <motion.button
                  className="px-4 py-2 rounded-md border bg-background hover:bg-accent disabled:opacity-50"
                  disabled={isProcessing}
                  onClick={closeConfirmDialog}
                  whileHover={!isProcessing ? { scale: 1.02 } : {}}
                  whileTap={!isProcessing ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  Batal
                </motion.button>
                <motion.button
                  className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    confirmDialog.type === 'activate'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-destructive text-white hover:bg-destructive/90'
                  }`}
                  disabled={isProcessing}
                  onClick={handleConfirmAction}
                  whileHover={!isProcessing ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!isProcessing ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : confirmDialog.type === 'activate' ? (
                    'Aktifkan'
                  ) : (
                    'Nonaktifkan'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  )
}
