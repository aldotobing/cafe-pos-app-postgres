"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Layers, Plus, Trash2, Barcode, Tag, Package,
  ChevronDown, ChevronUp, Edit3, AlertCircle, Loader2
} from "lucide-react"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/utils"
import type { ProductVariant, VariantAttribute, VariantAttributeValue } from "@/types"

type ConfirmDialogType = 'delete' | 'deactivate-all' | 'disable-variant-mode' | null

interface ConfirmDialogState {
  isOpen: boolean
  type: ConfirmDialogType
  title: string
  message: string
  confirmText: string
  cancelText: string
  variantId?: string
}

interface ProductVariantsManagerProps {
  menuId: string
  basePrice: number
  hppPrice: number
  hasVariants: boolean
  cafeId: number
  onHasVariantsChange: (hasVariants: boolean) => void
}

export function ProductVariantsManager({ 
  menuId, 
  basePrice, 
  hppPrice,
  hasVariants,
  cafeId,
  onHasVariantsChange 
}: ProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [attributes, setAttributes] = useState<VariantAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<VariantAttributeValue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state for new variant
  const [newVariant, setNewVariant] = useState({
    sku: "",
    barcode: "",
    price: basePrice,
    stockQuantity: 0,
    selectedAttributeValues: {} as Record<string, string> // attributeId -> valueId
  })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
    confirmText: 'Konfirmasi',
    cancelText: 'Batal'
  })

  // Load variants and attributes
  useEffect(() => {
    if (hasVariants && menuId) {
      loadVariants()
      loadAttributes()
    }
  }, [menuId, hasVariants])

  // Auto-expand and show add form when variant mode is active but no variants
  useEffect(() => {
    if (hasVariants && variants.length === 0) {
      setIsExpanded(true)
      setShowAddForm(true)
    }
  }, [hasVariants, variants.length])

  const loadVariants = async () => {
    try {
      const response = await fetch(`/api/rest/product_variants?menu_id=${menuId}`)
      const data = await response.json()

      // Handle different response formats
      const variantsList = Array.isArray(data) ? data : (data.data || data.results || [])

      setVariants(variantsList)
    } catch (error) {
      // Silent fail
    }
  }

  const loadAttributes = async () => {
    try {
      const response = await fetch(`/api/rest/variant_attributes?cafe_id=${cafeId}`)
      const data = await response.json()

      // Handle different response formats
      const attributesList = Array.isArray(data) ? data : (data.data || data.results || [])

      setAttributes(attributesList)
      
      // Load values for each attribute
      const allValues: VariantAttributeValue[] = []
      for (const attr of attributesList) {
        const valuesRes = await fetch(`/api/rest/variant_attribute_values?attribute_id=${attr.id}`)
        const valuesData = await valuesRes.json()
        const valuesList = Array.isArray(valuesData) ? valuesData : (valuesData.data || valuesData.results || [])
        allValues.push(...valuesList)
      }
      setAttributeValues(allValues)
    } catch (error) {
      // Silent fail
    }
  }

  const handleCreateVariant = async () => {
    if (Object.keys(newVariant.selectedAttributeValues).length === 0) {
      toast.error("Pilih minimal satu atribut varian")
      return
    }

    setIsLoading(true)
    try {
      const attributeIds = Object.values(newVariant.selectedAttributeValues).filter(Boolean)
      const variantName = attributeValues
        .filter(v => attributeIds.includes(v.id))
        .map(v => v.value)
        .join(" - ")

      const payload = {
        menu_id: menuId,
        sku: newVariant.sku || null,
        barcode: newVariant.barcode || null,
        variant_name: variantName,
        price: newVariant.price || null,
        hpp_price: hppPrice,
        stock_quantity: newVariant.stockQuantity,
        track_stock: true
      }
      
      const response = await fetch(`/api/rest/product_variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success || response.ok) {
        // Use server-returned ID
        const variantId = data.data?.id || data.id

        // Create attribute mappings
        for (const valueId of attributeIds) {
          await fetch(`/api/rest/variant_attribute_mappings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variant_id: variantId,
              attribute_value_id: valueId
            })
          })
        }

        // Record stock mutation if initial stock > 0
        if (newVariant.stockQuantity > 0) {
          if (!cafeId) {
            console.error('No cafeId available for stock mutation');
          } else {
            try {
              await fetch('/api/stock/mutations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  menuId: menuId,
                  variantId: variantId,
                  cafeId: cafeId,
                  type: 'in',
                  quantity: newVariant.stockQuantity,
                  hppPrice: hppPrice,
                  referenceType: 'initial_stock',
                  notes: `Stok awal pembuatan varian: ${variantName} = ${newVariant.stockQuantity}`,
                }),
              });
            } catch (mutationErr) {
              console.error('Failed to record stock mutation:', mutationErr);
            }
          }
        }

        toast.success("Varian berhasil ditambahkan")
        // Reset form untuk varian berikutnya, tapi tetap buka form
        setNewVariant({
          sku: "",
          barcode: "",
          price: basePrice,
          stockQuantity: 0,
          selectedAttributeValues: {}
        })
        loadVariants()
        onHasVariantsChange(true)
      } else {
        toast.error(data.error || "Gagal menambahkan varian")
      }
    } catch (error) {
      toast.error("Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteDialog = (variantId: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      title: 'Hapus Varian',
      message: 'Yakin ingin menghapus varian ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variantId
    })
  }

  const handleDeleteVariant = async () => {
    if (!confirmDialog.variantId) return

    try {
      const response = await fetch(`/api/rest/product_variants/${confirmDialog.variantId}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (data.success || response.ok) {
        toast.success("Varian dihapus")
        loadVariants()
        if (variants.length <= 1) {
          // Update hasVariants to false in parent state
          onHasVariantsChange(false)
          // Also update the menu item in database to reflect no variants
          await fetch(`/api/rest/menu/${menuId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ has_variants: false, hasVariants: false })
          })
          toast.info("Status varian diperbarui. Stok produk sekarang dikelola di level produk, bukan varian.")
        }
      } else {
        toast.error("Gagal menghapus varian")
      }
    } catch (error) {
      toast.error("Gagal menghapus varian")
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    }
  }

  const openDeactivateAllDialog = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'deactivate-all',
      title: 'Nonaktifkan Semua Varian',
      message: `Yakin ingin menonaktifkan semua ${variants.length} varian? Varian akan dinonaktifkan (bukan dihapus) dan bisa diaktifkan kembali nanti.`,
      confirmText: 'Nonaktifkan Semua',
      cancelText: 'Batal'
    })
  }

  const handleDeactivateAllVariants = async () => {
    setIsLoading(true)
    try {
      // Update all variants to inactive
      const promises = variants.map(variant =>
        fetch(`/api/rest/product_variants/${variant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: false, isActive: false })
        })
      )

      await Promise.all(promises)

      // Update hasVariants to false
      onHasVariantsChange(false)

      // Update menu item in database
      await fetch(`/api/rest/menu/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_variants: false, hasVariants: false })
      })

      toast.success(`${variants.length} varian berhasil dinonaktifkan`)
      toast.info("Status varian diperbarui. Stok produk sekarang dikelola di level produk.")
      loadVariants()
    } catch (error) {
      toast.error("Gagal menonaktifkan varian")
    } finally {
      setIsLoading(false)
    }
  }

  const generateSKU = () => {
    const prefix = "VAR"
    const timestamp = Date.now().toString(36).toUpperCase()
    setNewVariant(prev => ({ ...prev, sku: `${prefix}-${timestamp}` }))
  }

  if (!hasVariants) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Varian Produk</h4>
              <p className="text-xs text-muted-foreground">
                Aktifkan untuk produk dengan varian (ukuran, warna, dll.)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onHasVariantsChange(true)
              setIsExpanded(true)
              setShowAddForm(true)
            }}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
          >
            Aktifkan
          </button>
        </div>
      </div>
    )
  }

  // Handle case: hasVariants true but no variants exist
  const openDisableVariantModeDialog = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'disable-variant-mode',
      title: 'Nonaktifkan Mode Varian',
      message: 'Nonaktifkan mode varian untuk produk ini? Produk akan kembali ke mode tanpa varian dan stok bisa dikelola langsung di level produk.',
      confirmText: 'Nonaktifkan',
      cancelText: 'Batal'
    })
  }

  const handleDisableVariantMode = async () => {
    try {
      onHasVariantsChange(false)
      await fetch(`/api/rest/menu/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_variants: false, hasVariants: false })
      })
      toast.success("Mode varian dinonaktifkan")
    } catch (error) {
      toast.error("Gagal menonaktifkan mode varian")
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    }
  }

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  }

  const handleConfirmAction = () => {
    switch (confirmDialog.type) {
      case 'delete':
        handleDeleteVariant()
        break
      case 'deactivate-all':
        handleDeactivateAllVariants()
        break
      case 'disable-variant-mode':
        handleDisableVariantMode()
        break
    }
  }

  // Check if has variants but no variants exist
  const showEmptyVariantWarning = hasVariants && variants.length === 0

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-medium">Varian Produk</h4>
            <p className="text-xs text-muted-foreground">
              {showEmptyVariantWarning ? 'Belum ada varian' : `${variants.length} varian aktif`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
            Aktif
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Subtle disable button for empty variant mode */}
              {showEmptyVariantWarning && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mode varian aktif - tambahkan varian pertama</span>
                  <button
                    onClick={openDisableVariantModeDialog}
                    className="text-xs font-medium text-white bg-destructive hover:bg-destructive/90 px-2 py-0.5 rounded-full transition-all"
                  >
                    Nonaktifkan
                  </button>
                </div>
              )}

              {/* Variants List Header */}
              {variants.length > 0 && (
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs font-medium text-muted-foreground">
                    {variants.length} varian aktif
                  </span>
                  <button
                    onClick={openDeactivateAllDialog}
                    disabled={isLoading}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-50"
                  >
                    {isLoading ? "Menonaktifkan..." : "Nonaktifkan semua"}
                  </button>
                </div>
              )}

              {/* Variants List */}
              {variants.length > 0 ? (
                <div className="space-y-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {variant.variantName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {variant.sku && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {variant.sku}
                            </span>
                          )}
                          {variant.barcode && (
                            <span className="flex items-center gap-1">
                              <Barcode className="h-3 w-3" /> {variant.barcode}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            Stok: {variant.stock_quantity}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {formatRupiah(variant.price || basePrice)}
                        </span>
                        <button
                          onClick={() => openDeleteDialog(variant.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada varian</p>
                  <p className="text-xs mt-1">
                    Tambahkan varian pertama untuk produk ini
                  </p>
                </div>
              )}

              {/* Add Variant Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2 border border-dashed border-primary/30 rounded-lg text-primary hover:bg-primary/5 transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Varian Baru
                </button>
              )}

              {/* Add Variant Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-lg border bg-muted/30 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        Tambah Varian Baru
                      </h5>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Batal
                      </button>
                    </div>

                    {/* Attribute Selection */}
                    {attributes.length > 0 ? (
                      <div className="space-y-3">
                        {attributes.map((attr) => {
                          const values = attributeValues.filter(v => v.attribute_id === attr.id)
                          return (
                            <div key={attr.id}>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                {attr.name}
                              </label>
                              <select
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newVariant.selectedAttributeValues[attr.id] || ""}
                                onChange={(e) => setNewVariant(prev => ({
                                  ...prev,
                                  selectedAttributeValues: {
                                    ...prev.selectedAttributeValues,
                                    [attr.id]: e.target.value
                                  }
                                }))}
                              >
                                <option value="">Pilih {attr.name}</option>
                                {values.map((val) => (
                                  <option key={val.id} value={val.id}>
                                    {val.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p>Belum ada atribut varian</p>
                          <p className="text-xs mt-1">
                            Hubungi admin untuk menambahkan atribut (Warna, Ukuran, dll.)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SKU & Barcode */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          SKU
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                            placeholder="Contoh: KP-RED-M"
                            value={newVariant.sku}
                            onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                          />
                          <button
                            onClick={generateSKU}
                            className="px-2 py-1 text-xs bg-muted rounded-md hover:bg-muted/70 transition"
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Barcode
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Scan atau ketik"
                          value={newVariant.barcode}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, barcode: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Price & Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Harga (kosong = pakai harga dasar)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm"
                            placeholder={basePrice.toLocaleString('id-ID')}
                            value={newVariant.price ? newVariant.price.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '')
                              setNewVariant(prev => ({ 
                                ...prev, 
                                price: Number(raw) || 0 
                              }))
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Stok Awal
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="0"
                          value={newVariant.stockQuantity || ''}
                          onChange={(e) => setNewVariant(prev => ({ 
                            ...prev, 
                            stockQuantity: Number(e.target.value) || 0 
                          }))}
                        />
                      </div>
                    </div>

                    {/* Quick Add Button */}
                    <button
                      onClick={handleCreateVariant}
                      disabled={isLoading || Object.keys(newVariant.selectedAttributeValues).length === 0}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Tambah Varian
                        </>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground text-center">
                      Varian akan langsung tersimpan dan form akan reset untuk varian berikutnya
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-semibold text-lg mb-2">{confirmDialog.title}</h3>
              <p className="text-muted-foreground mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-2">
                <motion.button
                  className="px-4 py-2 rounded-md border bg-background hover:bg-accent disabled:opacity-50 text-sm"
                  disabled={isLoading}
                  onClick={closeConfirmDialog}
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {confirmDialog.cancelText}
                </motion.button>
                <motion.button
                  className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 text-sm ${
                    confirmDialog.type === 'delete'
                      ? 'bg-destructive text-white hover:bg-destructive/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  disabled={isLoading}
                  onClick={handleConfirmAction}
                  whileHover={!isLoading ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    confirmDialog.confirmText
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
