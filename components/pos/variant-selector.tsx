"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import { toast } from "sonner"
import type { ProductVariant } from "@/types"

interface VariantSelectorProps {
  menuItem: any
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: any, variant: ProductVariant, qty: number) => void
}

export function VariantSelector({ menuItem, isOpen, onClose, onAddToCart }: VariantSelectorProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && menuItem) {
      loadVariants()
      setSelectedVariant(null)
      setQuantity(1)
    }
  }, [isOpen, menuItem])

  const loadVariants = async () => {
    if (!menuItem?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rest/product_variants?menu_id=${menuItem.id}`)
      const data = await response.json()

      // Handle different response formats
      const variantsList = Array.isArray(data) ? data : (data.data || data.results || [])
      
      // Only show active variants
      const activeVariants = variantsList.filter((v: ProductVariant) => 
        v.is_active !== 0 && v.isActive !== false
      )
      setVariants(activeVariants)
    } catch (error) {
      console.error("Failed to load variants:", error)
      toast.error("Gagal memuat varian produk")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error("Pilih varian terlebih dahulu")
      return
    }

    // Check stock if tracking is enabled
    if (selectedVariant.trackStock || selectedVariant.track_stock) {
      const stock = selectedVariant.stockQuantity || selectedVariant.stock_quantity || 0
      if (stock < quantity) {
        toast.error(`Stok tidak mencukupi. Tersisa: ${stock}`)
        return
      }
    }

    onAddToCart(menuItem, selectedVariant, quantity)
    onClose()
  }

  const increaseQty = () => {
    if (!selectedVariant) return
    const stock = selectedVariant.stockQuantity || selectedVariant.stock_quantity || 0
    const isTrackingStock = !!(selectedVariant.trackStock || selectedVariant.track_stock)
    
    setQuantity(prev => {
      if (isTrackingStock && prev >= stock) {
        toast.error(`Stok tidak mencukupi. Tersisa: ${stock}`)
        return prev
      }
      return prev + 1
    })
  }
  const decreaseQty = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

  if (!isOpen || !menuItem) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md sm:max-w-lg bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header - Clean without icon */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg truncate">{menuItem.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Pilih varian yang tersedia</p>
            </div>
            <button
              onClick={onClose}
              className="ml-2 p-1.5 sm:p-2 rounded-lg hover:bg-muted transition shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-3">Memuat varian...</p>
              </div>
            ) : variants.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <p className="text-sm sm:text-base font-medium">Tidak ada varian aktif</p>
                <p className="text-xs sm:text-sm mt-1">Hubungi admin untuk menambahkan varian</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id
                  const price = variant.price || menuItem.price
                  const stock = variant.stockQuantity || variant.stock_quantity || 0
                  const isTrackingStock = !!(variant.trackStock || variant.track_stock)
                  const isOutOfStock = isTrackingStock && stock === 0
                  const isLowStock = isTrackingStock && stock <= (variant.minStock || variant.min_stock || 5)

                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        if (!isOutOfStock) {
                          setSelectedVariant(variant)
                          setQuantity(1)
                        }
                      }}
                      disabled={isOutOfStock}
                      className={`w-full p-3 sm:p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : isOutOfStock
                          ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base">
                            {variant.variantName || variant.variant_name}
                          </div>
                          {(variant.sku || variant.barcode) && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {variant.sku && <span>SKU: {variant.sku}</span>}
                              {variant.barcode && <span>Barcode: {variant.barcode}</span>}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm sm:text-base">
                            {formatRupiah(price)}
                          </div>
                          {isTrackingStock && (
                            <div className={`text-xs mt-0.5 ${
                              isOutOfStock 
                                ? 'text-red-500 font-medium' 
                                : isLowStock 
                                ? 'text-amber-500' 
                                : 'text-emerald-600'
                            }`}>
                              {isOutOfStock ? 'Habis' : `Stok ${stock}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Quantity Selector - Inline when variant selected */}
            {selectedVariant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Jumlah</span>
                    <p className="text-xs text-muted-foreground">
                      {selectedVariant.variantName || selectedVariant.variant_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={decreaseQty}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-background border flex items-center justify-center hover:bg-muted transition text-lg font-medium"
                    >
                      −
                    </button>
                    <span className="w-8 sm:w-10 text-center font-semibold text-base sm:text-lg">{quantity}</span>
                    <button
                      onClick={increaseQty}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-background border flex items-center justify-center hover:bg-muted transition text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-right">
                  <span className="text-xs text-muted-foreground">Total: </span>
                  <span className="font-semibold text-sm sm:text-base">
                    {formatRupiah((selectedVariant.price || menuItem.price) * quantity)}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/20 flex gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 sm:py-3 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium"
            >
              Batal
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || variants.length === 0}
              className="flex-1 px-4 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedVariant ? (
                <span className="flex items-center justify-center gap-2">
                  Tambah{quantity > 1 && ` ${quantity}`} · {formatRupiah((selectedVariant.price || menuItem.price) * quantity)}
                </span>
              ) : (
                "Pilih Varian"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
