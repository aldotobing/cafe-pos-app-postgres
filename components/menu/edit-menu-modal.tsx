"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Pencil, X, Package, FolderOpen, Loader2, DollarSign, TrendingUp, Layers } from "lucide-react"
import { ProductVariantsManager } from "./product-variants-manager"
import { ImageUpload } from "@/components/ui/image-upload"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useCategories, useMenu } from "@/hooks/use-cafe-data"
import { menuApi } from "@/lib/api"

interface EditMenuModalProps {
  menuItem: any;
  onClose: () => void;
  modalVariants: any;
}

export function EditMenuModal({ menuItem, onClose, modalVariants }: EditMenuModalProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const { categories } = useCategories(cafeId)
  const { mutate: mutateMenu } = useMenu(cafeId)
  
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditPriceManual, setIsEditPriceManual] = useState(false)
  const [hasVariants, setHasVariants] = useState(false)
  
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    categoryId: "",
    hppPrice: 0,
    marginPercent: 30,
    price: 0,
    stockQuantity: 0,
    minStock: 5,
    trackStock: false,
    available: true,
    imageUrl: "",
    hasVariants: false,
  })

  // Initialize form when menuItem changes
  useEffect(() => {
    if (menuItem) {
      const hppPrice = menuItem.hppPrice || 0;
      const price = menuItem.price || 0;
      const marginPercent = hppPrice > 0 && price > 0
        ? Math.round(((price - hppPrice) / hppPrice) * 100)
        : 30;

      setEditForm({
        name: menuItem.name,
        category: categories.find(c => c.id === menuItem.categoryId)?.name || (menuItem.category && String(menuItem.category)) || "",
        categoryId: menuItem.categoryId || "",
        price: price,
        hppPrice: hppPrice,
        marginPercent: marginPercent,
        stockQuantity: menuItem.stockQuantity || 0,
        minStock: menuItem.minStock || 5,
        trackStock: menuItem.trackStock === true,
        available: menuItem.available === true,
        imageUrl: menuItem.imageUrl || "",
        hasVariants: menuItem.hasVariants === true || menuItem.has_variants === 1,
      });
      setHasVariants(menuItem.hasVariants === true || menuItem.has_variants === 1);
    }
  }, [menuItem, categories])

  // Auto-calculate price when HPP or margin changes
  useEffect(() => {
    if (!isEditPriceManual && editForm.hppPrice > 0 && editForm.marginPercent > 0) {
      const calculatedPrice = Math.round(editForm.hppPrice * (1 + editForm.marginPercent / 100));
      if (Math.abs(editForm.price - calculatedPrice) > 1) {
        setEditForm(f => ({ ...f, price: calculatedPrice }));
      }
    }
  }, [editForm.hppPrice, editForm.marginPercent, isEditPriceManual]);

  // Auto-calculate margin when price is manually set
  useEffect(() => {
    if (isEditPriceManual && editForm.hppPrice > 0 && editForm.price > 0) {
      const calculatedMargin = ((editForm.price - editForm.hppPrice) / editForm.hppPrice) * 100;
      if (Math.abs(editForm.marginPercent - calculatedMargin) > 0.1) {
        setEditForm(f => ({ ...f, marginPercent: Math.round(calculatedMargin * 10) / 10 }));
      }
    }
  }, [editForm.hppPrice, editForm.price, isEditPriceManual]);

  const handleUpdate = async () => {
    if (!menuItem.id) {
      toast.error('Tidak dapat mengupdate menu: ID not valid');
      return;
    }

    if (isNaN(editForm.price) || editForm.price < 0) {
      toast.error('Harga tidak valid. Harap masukkan angka positif.');
      return;
    }

    setIsUpdating(true);
    try {
      const oldStock = menuItem.stockQuantity || 0;
      const newStock = editForm.hasVariants ? 0 : editForm.stockQuantity;
      const stockChanged = !editForm.hasVariants && oldStock !== newStock;

      await menuApi.update(menuItem.id, {
        name: editForm.name,
        price: editForm.price,
        hppPrice: editForm.hppPrice,
        marginPercent: editForm.marginPercent,
        stockQuantity: newStock,
        minStock: editForm.minStock,
        trackStock: editForm.trackStock,
        category: editForm.category,
        categoryId: editForm.categoryId,
        available: editForm.available,
        imageUrl: editForm.imageUrl || undefined,
        hasVariants: hasVariants,
      });

      // Record stock mutation if stock changed (for non-variant products)
      if (stockChanged) {
        const mutationId = crypto.randomUUID();
        const quantityDiff = newStock - oldStock;

        try {
          await fetch('/api/stock/mutations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: mutationId,
              menuId: menuItem.id,
              cafeId: cafeId,
              type: quantityDiff > 0 ? 'in' : 'out',
              quantity: Math.abs(quantityDiff),
              hppPrice: editForm.hppPrice,
              referenceType: 'adjustment',
              referenceId: menuItem.id,
              notes: `Adjustment stok dari edit menu: ${oldStock} → ${newStock}`,
            }),
          });
        } catch (mutationErr) {
          console.error('Failed to record stock mutation:', mutationErr);
        }
      }

      toast.success('Barang berhasil diupdate');
      // Refresh data
      mutateMenu();
      onClose();
    } catch (error) {
      toast.error('Gagal mengupdate barang. Silakan coba lagi.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-card border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {/* Modal Header */}
        <div className="sticky top-0 px-6 py-4 border-b bg-card z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Ubah Barang</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Informasi Dasar */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">Informasi Dasar</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">Nama dan kategori barang</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nama Barang <span className="text-red-500">*</span></label>
                  <motion.input
                    type="text"
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Contoh: Kaus Polos / Nasi Goreng"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">Kategori</label>
                    <button
                      onClick={() => router.push('/categories')}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Kelola
                    </button>
                  </div>
                  {loadingCategories ? (
                    <div className="relative">
                      <div className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">Memuat kategori...</span>
                      </div>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Belum ada kategori</p>
                      <button
                        onClick={() => router.push('/categories')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        + Tambah Kategori
                      </button>
                    </div>
                  ) : (
                    <motion.select
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                      value={editForm.categoryId}
                      onChange={(e) => {
                        const selectedCat = categories.find(c => c.id === e.target.value);
                        setEditForm({...editForm, categoryId: e.target.value, category: selectedCat?.name || ''});
                      }}
                      whileFocus={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                    >
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </motion.select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t"></div>

          {/* Section 2: Harga & Margin */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">Harga & Margin</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">Harga modal, margin laba, dan harga jual</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-sm font-medium mb-1.5 block">HPP (Harga Modal)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rp</span>
                    <motion.input
                      type="text"
                      inputMode="numeric"
                      className="w-full rounded-lg border bg-background pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      value={editForm.hppPrice ? editForm.hppPrice.toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        const newHpp = Number(raw) || 0;
                        setEditForm({...editForm, hppPrice: newHpp});
                      }}
                      placeholder="0"
                      whileFocus={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Margin</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <motion.input
                        type="number"
                        className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        value={editForm.marginPercent || ''}
                        onChange={(e) => {
                          const newMargin = Number(e.target.value) || 0;
                          setEditForm({...editForm, marginPercent: newMargin});
                        }}
                        min="0"
                        max="999"
                        placeholder="0"
                        whileFocus={{ scale: 1.005 }}
                        transition={{ duration: 0.15 }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        %
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[10, 25, 40].map((margin) => (
                        <button
                          key={margin}
                          type="button"
                          onClick={() => {
                            setIsEditPriceManual(false);
                            setEditForm({...editForm, marginPercent: margin});
                          }}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            editForm.marginPercent === margin && !isEditPriceManual
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {margin}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-calculated Selling Price */}
              <div className="rounded-lg bg-muted/50 border p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {isEditPriceManual ? 'Harga Jual (Manual)' : 'Harga Jual (Otomatis)'}
                  </label>
                  <div className="flex items-center gap-2">
                    {editForm.hppPrice > 0 && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        +{formatRupiah(editForm.price - editForm.hppPrice)} laba
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditPriceManual(!isEditPriceManual)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>{isEditPriceManual ? 'Auto' : 'Edit'}</span>
                    </button>
                  </div>
                </div>
                {isEditPriceManual ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none font-bold">Rp</span>
                    <motion.input
                      type="text"
                      inputMode="numeric"
                      className="w-full bg-background border rounded-lg pl-9 pr-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      value={editForm.price ? editForm.price.toLocaleString('id-ID') : ''}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setEditForm({...editForm, price: Number(raw) || 0});
                      }}
                      whileFocus={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold">
                    {editForm.price > 0 ? formatRupiah(editForm.price) : <span className="text-muted-foreground/50">Rp 0</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t"></div>

          {/* Section 3: Stok & Pengaturan */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">Stok & Pengaturan</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">Stok saat ini, minimum stok, dan preferensi tampilan</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Info for variant products */}
              {hasVariants && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-900/30">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Produk ini memiliki varian. Stok dikelola per varian, bukan di level produk.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Stok Saat Ini
                    {hasVariants && <span className="ml-1 text-[10px] text-muted-foreground font-normal">(Nonaktif)</span>}
                  </label>
                  <motion.input
                    type="number"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all ${
                      hasVariants
                        ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                        : 'bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
                    }`}
                    value={editForm.stockQuantity || ''}
                    onChange={(e) => !hasVariants && setEditForm({...editForm, stockQuantity: Number(e.target.value) || 0})}
                    min="0"
                    placeholder={hasVariants ? "0" : "0"}
                    disabled={hasVariants}
                    whileFocus={!hasVariants ? { scale: 1.005 } : undefined}
                    transition={{ duration: 0.15 }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Min. Stok
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal hidden md:inline">(Batas peringatan)</span>
                  </label>
                  <motion.input
                    type="number"
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    value={editForm.minStock || ''}
                    onChange={(e) => setEditForm({...editForm, minStock: Number(e.target.value) || 5})}
                    min="0"
                    placeholder="5"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-emerald-500/10">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Track Stok</div>
                      <div className="text-[10px] text-muted-foreground">Pantau stok barang secara otomatis</div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editForm.trackStock}
                      onChange={(e) => setEditForm({...editForm, trackStock: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-blue-500/10">
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Tampil di POS</div>
                      <div className="text-[10px] text-muted-foreground">Barang terlihat saat kasir membuat transaksi</div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editForm.available}
                      onChange={(e) => setEditForm({...editForm, available: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
                  </div>
                </label>
              </div>

              {/* Image Upload */}
              <ImageUpload
                value={editForm.imageUrl}
                onChange={(url) => setEditForm(f => ({ ...f, imageUrl: url }))}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t"></div>

          {/* Section 4: Varian Produk */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md bg-purple-500/10">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">Varian Produk</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">Kelola varian (ukuran, warna, model)</p>
              </div>
            </div>
            <ProductVariantsManager
              menuId={menuItem.id}
              menuName={menuItem.name}
              basePrice={editForm.price}
              hppPrice={editForm.hppPrice}
              hasVariants={hasVariants}
              cafeId={menuItem.cafe_id || cafeId}
              onHasVariantsChange={(value) => {
                setHasVariants(value)
                setEditForm(prev => ({ ...prev, hasVariants: value }))
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t bg-card flex gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="flex-1 px-4 py-2.5 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                <span>Simpan</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
