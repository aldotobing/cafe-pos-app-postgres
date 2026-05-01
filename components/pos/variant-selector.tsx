"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minus, Plus, Package, ShoppingCart, AlertCircle } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import { toast } from "sonner"
import type { ProductVariant } from "@/types"
import { ImageIcon } from "lucide-react"

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

  const menuImage = menuItem.image_url || menuItem.imageUrl

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md sm:max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] border"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header with Product Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center gap-3 sm:gap-4 shrink-0 relative">
              {/* Product Thumbnail */}
              <div className="relative shrink-0">
                {menuImage ? (
                  <img
                    src={menuImage}
                    alt={menuItem.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md border"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-md border">
                    <Package className="w-6 h-6 sm:w-7 sm:h-7 text-primary/60" />
                  </div>
                )}
                {selectedVariant && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm"
                  >
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate leading-tight">{menuItem.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {selectedVariant 
                    ? `${selectedVariant.variantName || selectedVariant.variant_name} • ${formatRupiah(selectedVariant.price || menuItem.price)}`
                    : `Pilih dari ${variants.length} varian tersedia`
                  }
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition shrink-0 -mr-1"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-14">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-4 font-medium">Memuat varian...</p>
              </div>
            ) : variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm sm:text-base font-medium">Tidak ada varian aktif</p>
                <p className="text-xs sm:text-sm mt-1 text-muted-foreground/70">Hubungi admin untuk menambahkan varian</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {variants.map((variant, index) => {
                  const isSelected = selectedVariant?.id === variant.id
                  const price = variant.price || menuItem.price
                  const stock = variant.stockQuantity || variant.stock_quantity || 0
                  const isTrackingStock = !!(variant.trackStock || variant.track_stock)
                  const isOutOfStock = isTrackingStock && stock === 0
                  const isLowStock = isTrackingStock && stock <= (variant.minStock || variant.min_stock || 5)

                  return (
                    <motion.button
                      key={variant.id}
                      onClick={() => {
                        if (!isOutOfStock) {
                          setSelectedVariant(variant)
                          setQuantity(1)
                        }
                      }}
                      disabled={isOutOfStock}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={!isOutOfStock ? { scale: 1.01 } : {}}
                      whileTap={!isOutOfStock ? { scale: 0.99 } : {}}
                      className={`w-full p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : isOutOfStock
                          ? 'border-muted bg-muted/20 opacity-60 cursor-not-allowed'
                          : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base truncate">
                              {variant.variantName || variant.variant_name}
                            </span>
                            {isSelected && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                                Dipilih
                              </span>
                            )}
                          </div>
                          {(variant.sku || variant.barcode) && (
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                              {variant.sku && (
                                <span className="px-1.5 py-0.5 rounded bg-muted font-medium">SKU: {variant.sku}</span>
                              )}
                              {variant.barcode && (
                                <span className="px-1.5 py-0.5 rounded bg-muted">{variant.barcode}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm sm:text-base text-foreground">
                            {formatRupiah(price)}
                          </div>
                          {isTrackingStock && (
                            <div className={`text-xs mt-0.5 font-medium ${
                              isOutOfStock 
                                ? 'text-red-500 flex items-center gap-1' 
                                : isLowStock 
                                ? 'text-amber-500' 
                                : 'text-emerald-600'
                            }`}>
                              {isOutOfStock && <AlertCircle className="w-3 h-3 inline" />}
                              {isOutOfStock ? 'Stok habis' : `Stok: ${stock}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}

            {/* Quantity Selector - Elegant inline design */}
            <AnimatePresence>
              {selectedVariant && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl border bg-gradient-to-br from-muted/50 to-background shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold block">Jumlah Pesanan</span>
                          <p className="text-xs text-muted-foreground">
                            {selectedVariant.variantName || selectedVariant.variant_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-background rounded-xl border p-1 shadow-sm">
                        <motion.button
                          onClick={decreaseQty}
                          whileTap={{ scale: 0.9 }}
                          className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition"
                        >
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                        <motion.button
                          onClick={increaseQty}
                          whileTap={{ scale: 0.9 }}
                          className="w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition"
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <span className="font-bold text-lg text-primary">
                        {formatRupiah((selectedVariant.price || menuItem.price) * quantity)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Elegant dual button */}
          <div className="px-4 sm:px-6 py-4 border-t bg-muted/30 flex gap-3 shrink-0">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 rounded-xl border bg-background hover:bg-muted transition text-sm font-medium shadow-sm"
            >
              Batal
            </motion.button>
            <motion.button
              onClick={handleAddToCart}
              disabled={!selectedVariant || variants.length === 0}
              whileHover={selectedVariant ? { scale: 1.02 } : {}}
              whileTap={selectedVariant ? { scale: 0.98 } : {}}
              className="flex-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-semibold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {selectedVariant ? (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Tambah ke Pesanan</span>
                  <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
                    {quantity}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Pilih Varian
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
