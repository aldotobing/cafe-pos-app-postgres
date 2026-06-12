"use client"

import { AppShell } from "@/components/app-shell"
import { useCallback, useEffect, useState } from "react"
import { useCategories, useMenu } from "@/hooks/use-cafe-data"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner"
import {
  BadgePercent, Plus, Pencil, Trash2, X, Loader2,
} from "lucide-react"

interface Promotion {
  id: string
  cafeId: number
  name: string
  type: 'percent' | 'flat'
  value: number
  minSubtotal: number
  maxDiscount: number | null
  appliesTo: 'all' | 'categories' | 'specific_items'
  targetItemIds: string[]
  targetCategoryIds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PromotionsPage() {
  const { userData, loading: authLoading, user } = useAuth()
  const cafeId = userData?.cafe_id
  const router = useRouter()
  const { menu } = useMenu(cafeId)
  const { categories } = useCategories(cafeId)

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Category IDs already claimed by other promotions.
  // When editing, the current promo's own categories are excluded so they remain selectable.
  const usedCategoryIds = new Set<string>(
    promotions
      .filter(p => !editingPromo || p.id !== editingPromo.id)
      .flatMap(p => p.targetCategoryIds || [])
  )

  // Item IDs already claimed by other promotions (same one-to-one rule).
  const usedItemIds = new Set<string>(
    promotions
      .filter(p => !editingPromo || p.id !== editingPromo.id)
      .flatMap(p => p.targetItemIds || [])
  )

  const [form, setForm] = useState({
    name: '',
    type: 'percent' as 'percent' | 'flat',
    value: 0,
    minSubtotal: 0,
    maxDiscount: 0,
    appliesTo: 'all' as 'all' | 'categories' | 'specific_items',
    targetItemIds: [] as string[],
    targetCategoryIds: [] as string[],
  })

  const fetchPromotions = useCallback(async () => {
    if (!cafeId) return
    setLoading(true)
    try {
      const res = await fetcher(`/api/promotions?cafeId=${cafeId}`)
      setPromotions(res.promotions || [])
    } catch {
      toast.error("Gagal memuat data promosi")
    } finally {
      setLoading(false)
    }
  }, [cafeId])

  useEffect(() => {
    if (cafeId) fetchPromotions()
  }, [cafeId, fetchPromotions])

  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login')
    }
  }, [user, userData, authLoading, router])

  const openAdd = () => {
    setEditingPromo(null)
    setForm({ name: '', type: 'percent', value: 0, minSubtotal: 0, maxDiscount: 0, appliesTo: 'all', targetItemIds: [], targetCategoryIds: [] })
    setShowForm(true)
  }

  const openEdit = (promo: Promotion) => {
    setEditingPromo(promo)
    setForm({
      name: promo.name,
      type: promo.type,
      value: promo.value,
      minSubtotal: promo.minSubtotal,
      maxDiscount: promo.maxDiscount || 0,
      appliesTo: promo.appliesTo,
      targetItemIds: promo.targetItemIds || [],
      targetCategoryIds: promo.targetCategoryIds || [],
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingPromo(null)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama promosi wajib diisi")
      return
    }
    if (form.value <= 0) {
      toast.error("Nilai diskon harus lebih dari 0")
      return
    }
    // Block if any selected category is already used by another promotion
    if (form.appliesTo === 'categories' && form.targetCategoryIds.length > 0) {
      const overlapping = form.targetCategoryIds.filter(id => usedCategoryIds.has(id))
      if (overlapping.length > 0) {
        const names = overlapping
          .map(id => categories.find(c => c.id === id)?.name)
          .filter(Boolean)
          .join(', ')
        toast.error(`Kategori sudah digunakan di promosi lain: ${names}`)
        return
      }
    }
    // Block if any selected item is already used by another promotion
    if (form.appliesTo === 'specific_items' && form.targetItemIds.length > 0) {
      const overlapping = form.targetItemIds.filter(id => usedItemIds.has(id))
      if (overlapping.length > 0) {
        const names = overlapping
          .map(id => menu.find(m => m.id === id)?.name)
          .filter(Boolean)
          .join(', ')
        toast.error(`Menu sudah digunakan di promosi lain: ${names}`)
        return
      }
    }
    setIsSubmitting(true)
    try {
      const url = editingPromo ? `/api/promotions/${editingPromo.id}` : '/api/promotions'
      const method = editingPromo ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId,
          name: form.name,
          type: form.type,
          value: form.value,
          minSubtotal: form.minSubtotal,
          maxDiscount: form.maxDiscount || null,
          appliesTo: form.appliesTo,
          targetItemIds: form.targetItemIds,
          targetCategoryIds: form.targetCategoryIds,
        }),
      })
      if (response.ok) {
        toast.success(editingPromo ? 'Promosi berhasil diupdate' : 'Promosi berhasil ditambahkan')
        handleCloseForm()
        await fetchPromotions()
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Gagal menyimpan')
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan promosi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (promo: Promotion) => {
    setTogglingId(promo.id)
    setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: !p.isActive } : p))
    try {
      const response = await fetch(`/api/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive }),
      })
      if (!response.ok) {
        setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: promo.isActive } : p))
        toast.error("Gagal mengubah status promosi")
      }
    } catch {
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: promo.isActive } : p))
      toast.error("Gagal mengubah status promosi")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/promotions/${deleteConfirmId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Promosi berhasil dihapus')
        setDeleteConfirmId(null)
        await fetchPromotions()
      } else {
        throw new Error('Gagal menghapus')
      }
    } catch {
      toast.error("Gagal menghapus promosi")
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleTargetItem = (id: string) => {
    setForm(prev => ({
      ...prev,
      targetItemIds: prev.targetItemIds.includes(id)
        ? prev.targetItemIds.filter(i => i !== id)
        : [...prev.targetItemIds, id]
    }))
  }

  const toggleTargetCategory = (id: string) => {
    setForm(prev => ({
      ...prev,
      targetCategoryIds: prev.targetCategoryIds.includes(id)
        ? prev.targetCategoryIds.filter(i => i !== id)
        : [...prev.targetCategoryIds, id]
    }))
  }

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const getAppliesToLabel = (p: Promotion) => {
    if (p.appliesTo === 'all') return 'Semua menu'
    if (p.appliesTo === 'categories') {
      if (!p.targetCategoryIds?.length) return 'Kategori (tidak ada)'
      const names = p.targetCategoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean)
      return `Kategori: ${names.length > 0 ? names.join(', ') : p.targetCategoryIds.length + ' dipilih'}`
    }
    if (p.appliesTo === 'specific_items') {
      if (!p.targetItemIds?.length) return 'Menu (tidak ada)'
      const names = p.targetItemIds.map(id => menu.find(m => m.id === id)?.name).filter(Boolean)
      return `Menu: ${names.length > 0 ? names.join(', ') : p.targetItemIds.length + ' dipilih'}`
    }
    return ''
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            <p className="text-muted-foreground text-sm">Memuat data promosi...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const deletingPromo = promotions.find(p => p.id === deleteConfirmId)

  return (
    <AppShell>
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Promosi</h1>
          <p className="text-sm text-muted-foreground">
            Kelola diskon otomatis dan promosi untuk transaksi.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-md shadow-primary/10 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Promo</span>
        </button>
      </motion.div>

      {/* Content */}
      <div className="space-y-4">
        {promotions.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/50 rounded-3xl border-2 border-dashed border-muted/50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-4 rounded-full bg-muted/30 mb-4 text-muted-foreground/30">
              <BadgePercent className="h-16 w-16" />
            </div>
            <h3 className="text-xl font-bold mb-2">Belum ada promosi</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Buat promosi pertama untuk diskon otomatis transaksi berdasarkan subtotal atau menu tertentu.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <AnimatePresence mode="popLayout">
              {promotions.map((promo) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  className="bg-card border rounded-xl shadow-subtle hover:shadow-md hover:border-primary/20 transition-all duration-200 p-3 sm:p-4"
                >
                  {/* Top row: icon + name + toggle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                      <BadgePercent className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{promo.name}</div>
                      <div className="text-xs text-muted-foreground font-mono font-semibold text-primary">
                        {promo.type === 'percent' ? `${promo.value}%` : formatRupiah(promo.value)}
                        {promo.minSubtotal > 0 && <span className="font-normal text-muted-foreground"> · Min {formatRupiah(promo.minSubtotal)}</span>}
                        {promo.maxDiscount && <span className="font-normal text-muted-foreground"> · Max {formatRupiah(promo.maxDiscount)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingId === promo.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          promo.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                        } ${togglingId === promo.id ? 'opacity-70 cursor-wait' : ''}`}
                        title={promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {togglingId === promo.id ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 text-white animate-spin" />
                          </span>
                        ) : (
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              promo.isActive ? 'translate-x-[18px]' : 'translate-x-[2px]'
                            }`}
                          />
                        )}
                      </button>
                      <span className={`text-[10px] font-medium ${promo.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {promo.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: applies-to detail */}
                  <div className="mt-2 text-xs text-muted-foreground truncate">
                    {getAppliesToLabel(promo)}
                  </div>

                  {/* Bottom row: edit + delete */}
                  <div className="flex items-center justify-end gap-1 mt-2.5 pt-2 border-t border-border/30">
                    <button
                      onClick={() => openEdit(promo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(promo.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseForm}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                {/* Dialog Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <BadgePercent className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      {editingPromo ? 'Edit Promosi' : 'Tambah Promosi'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 rounded-md hover:bg-muted transition"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Dialog Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nama Promosi</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Contoh: Happy Hour Siang"
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tipe Diskon</label>
                      <select
                        value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'flat' }))}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      >
                        <option value="percent">Persentase (%)</option>
                        <option value="flat">Nominal (Rp)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        {form.type === 'percent' ? 'Persentase (%)' : 'Nominal (Rp)'}
                      </label>
                      <input
                        type="number"
                        value={form.value || ''}
                        onChange={e => setForm(f => ({ ...f, value: Math.max(0, Number(e.target.value) || 0) }))}
                        min={0}
                        placeholder={form.type === 'percent' ? '10' : '5000'}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Min Subtotal (Rp)</label>
                      <input
                        type="number"
                        value={form.minSubtotal || ''}
                        onChange={e => setForm(f => ({ ...f, minSubtotal: Math.max(0, Number(e.target.value) || 0) }))}
                        min={0}
                        placeholder="0"
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Max Diskon (Rp)</label>
                      <input
                        type="number"
                        value={form.maxDiscount || ''}
                        onChange={e => setForm(f => ({ ...f, maxDiscount: Math.max(0, Number(e.target.value) || 0) }))}
                        min={0}
                        placeholder="0 = tanpa batas"
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Berlaku Untuk</label>
                    <select
                      value={form.appliesTo}
                      onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value as 'all' | 'categories' | 'specific_items' }))}
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    >
                      <option value="all">Semua Menu</option>
                      <option value="categories">Kategori Tertentu</option>
                      <option value="specific_items">Menu Tertentu</option>
                    </select>
                  </div>

                  {form.appliesTo === 'categories' && (
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                      <p className="text-xs text-muted-foreground mb-2">Pilih kategori:</p>
                      {categories.map(cat => {
                        const isUsed = usedCategoryIds.has(cat.id)
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-2 py-1 ${isUsed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            title={isUsed ? `Kategori "${cat.name}" sudah digunakan di promosi lain` : ''}
                          >
                            <input
                              type="checkbox"
                              checked={form.targetCategoryIds.includes(cat.id)}
                              onChange={() => !isUsed && toggleTargetCategory(cat.id)}
                              disabled={isUsed}
                              className="rounded accent-primary disabled:opacity-40"
                            />
                            <span className="text-sm">{cat.name}</span>
                            {isUsed && (
                              <span className="text-[10px] text-muted-foreground/60">(sudah digunakan)</span>
                            )}
                          </label>
                        )
                      })}
                      {categories.every(c => usedCategoryIds.has(c.id)) && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Semua kategori sudah digunakan di promosi lain.
                        </p>
                      )}
                    </div>
                  )}

                  {form.appliesTo === 'specific_items' && (
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                      <p className="text-xs text-muted-foreground mb-2">Pilih menu:</p>
                      {menu
                        .filter(item => !usedItemIds.has(item.id))
                        .map(item => (
                          <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.targetItemIds.includes(item.id)}
                              onChange={() => toggleTargetItem(item.id)}
                              className="rounded accent-primary"
                            />
                            <span className="text-sm">{item.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{formatRupiah(item.price)}</span>
                          </label>
                        ))}
                      {menu.every(item => usedItemIds.has(item.id)) && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Semua menu sudah digunakan di promosi lain.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Dialog Footer */}
                <div className="flex gap-2 p-4 border-t bg-muted/20">
                  <button
                    onClick={handleCloseForm}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !form.name.trim()}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>{editingPromo ? 'Update' : 'Tambah'}</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-full bg-red-500/10 flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Hapus Promosi?</h3>
                      <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus promosi <span className="font-medium text-foreground">"{deletingPromo?.name}"</span>?
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Promosi yang dihapus tidak dapat dikembalikan.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t bg-muted/20">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Hapus</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
