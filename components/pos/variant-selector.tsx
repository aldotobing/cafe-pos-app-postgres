"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minus, Plus, Package, ShoppingCart, ChevronDown, Check } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import { toast } from "sonner"
import type { ProductVariant } from "@/types"
import { OptimizedImage } from "@/components/ui/optimized-image"

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

interface SelectedVariant {
  variant: ProductVariant
  quantity: number
}

interface VariantSelectorProps {
  menuItem: any
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: any, variant: ProductVariant, qty: number) => void
}

export function VariantSelector({ menuItem, isOpen, onClose, onAddToCart }: VariantSelectorProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(15)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
    const handleResize = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const displayedVariants = useMemo(() => variants.slice(0, displayLimit), [variants, displayLimit])
  const hasMoreVariants = variants.length > displayLimit

  useEffect(() => {
    if (isOpen && menuItem) {
      loadVariants()
      setSelectedVariants([])
    }
  }, [isOpen, menuItem])

  const loadVariants = async () => {
    if (!menuItem?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rest/product_variants?menu_id=${menuItem.id}`)
      const data = await response.json()
      const variantsList = Array.isArray(data) ? data : (data.data || data.results || [])
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
    if (isAddingToCart) return
    if (selectedVariants.length === 0) {
      toast.error("Pilih minimal satu varian", { id: "variant-select" })
      return
    }
    setIsAddingToCart(true)

    const errors: string[] = []
    for (const { variant, quantity } of selectedVariants) {
      const stock = variant.stockQuantity || variant.stock_quantity || 0
      if (stock === 0) {
        errors.push(`${variant.variantName || variant.variant_name}: habis`)
      } else if (stock < quantity) {
        errors.push(`${variant.variantName || variant.variant_name}: hanya tersedia ${stock}`)
      }
    }
    if (errors.length > 0) {
      toast.error(errors.join(" • "), { id: "variant-stock", duration: 3000 })
      setIsAddingToCart(false)
      return
    }

    selectedVariants.forEach(({ variant, quantity }) => {
      onAddToCart(menuItem, variant, quantity)
    })

    const totalItems = selectedVariants.reduce((sum, { quantity }) => sum + quantity, 0)
    const label =
      selectedVariants.length === 1
        ? `${menuItem.name} - ${selectedVariants[0].variant.variantName || selectedVariants[0].variant.variant_name}`
        : `${totalItems} item`
    toast.success(`${label} ditambahkan ke pesanan`)
    setTimeout(() => {
      onClose()
      setIsAddingToCart(false)
    }, 100)
  }

  const toggleVariant = (variant: ProductVariant) => {
    const existing = selectedVariants.find(sv => sv.variant.id === variant.id)
    if (existing) {
      setSelectedVariants(prev => prev.filter(sv => sv.variant.id !== variant.id))
    } else {
      setSelectedVariants(prev => [...prev, { variant, quantity: 1 }])
    }
  }

  const updateQuantity = (variantId: string, delta: number) => {
    setSelectedVariants(prev => prev.map(sv => {
      if (sv.variant.id === variantId) {
        const stock = sv.variant.stockQuantity || sv.variant.stock_quantity || 0
        const newQty = Math.min(stock, Math.max(1, sv.quantity + delta))
        return { ...sv, quantity: newQty }
      }
      return sv
    }))
  }

  const getSelectedQuantity = (variantId: string) => {
    return selectedVariants.find(sv => sv.variant?.id === variantId)?.quantity || 1
  }

  const isSelected = (variantId: string) => {
    return selectedVariants.some(sv => sv.variant?.id === variantId)
  }

  const totalSelectedItems = selectedVariants.reduce((sum, { quantity }) => sum + quantity, 0)
  const totalSelectedPrice = selectedVariants.reduce((sum, { variant, quantity }) => {
    if (!variant || !menuItem) return sum
    return sum + (variant.price || menuItem.price) * quantity
  }, 0)

  const menuImage = menuItem?.image_url || menuItem?.imageUrl
  const basePrice = menuItem?.price || 0

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !menuItem) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          className="relative z-[61] w-full max-w-md sm:max-w-lg bg-card rounded-[1.25rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border/50"
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >

          {/* ══════ HERO HEADER ══════ */}
          <div className="relative shrink-0">
            <div className="relative w-full h-36 xs:h-40 sm:h-48 overflow-hidden bg-muted">
              <OptimizedImage
                src={menuImage}
                alt={menuItem.name}
                fill
                objectFit="cover"
                containerClassName="w-full h-full"
                fallback={
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Package className="w-7 h-7 text-primary/50" />
                      </div>
                      <span className="text-sm text-muted-foreground/60 font-medium">No image</span>
                    </div>
                  </div>
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/35 flex items-center justify-center transition shadow-sm"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {selectedVariants.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-sm"
              >
                <ShoppingCart className="w-3 h-3 text-white" />
                <span className="text-xs font-semibold text-white">{selectedVariants.length} varian</span>
              </motion.div>
            )}

            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-5 pb-4 sm:pb-5 pt-3">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight line-clamp-1">
                {menuItem.name}
              </h2>
              <p className="text-sm text-white/80 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-xs font-medium backdrop-blur-sm">
                  {formatRupiah(basePrice)}
                </span>
                <span className="text-white/60">
                  {variants.length > 0 ? `${variants.length} varian` : 'Tidak ada varian'}
                </span>
              </p>
            </div>
          </div>

          {/* ══════ CONTENT ══════ */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-muted" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground mt-4 font-medium">Memuat varian...</p>
              </div>
            ) : variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">Tidak ada varian aktif</p>
                <p className="text-xs mt-1.5 text-muted-foreground/60">Hubungi admin untuk menambahkan varian</p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 space-y-2">
                {displayedVariants.map((variant, index) => {
                  const price = variant.price || basePrice
                  const stock = variant.stockQuantity || variant.stock_quantity || 0
                  const isOutOfStock = stock === 0
                  const isLowStock = stock > 0 && stock <= (variant.minStock || variant.min_stock || 5)
                  const selected = isSelected(variant.id)
                  const variantName = variant.variantName || variant.variant_name

                  const stockColor = isOutOfStock
                    ? 'bg-red-500'
                    : isLowStock
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'

                  const stockTextColor = isOutOfStock
                    ? 'text-red-600 dark:text-red-400'
                    : isLowStock
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'

                  return (
                    <motion.div
                      key={variant.id}
                      initial={isMobile ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={isMobile ? { duration: 0 } : { delay: index * 0.04, duration: 0.2 }}
                      className={`group rounded-xl transition-all duration-200 ${
                        selected
                          ? 'bg-primary/[0.07] ring-2 ring-primary/40 shadow-sm'
                          : isOutOfStock
                          ? 'bg-muted/40 ring-1 ring-transparent'
                          : 'bg-card ring-1 ring-border/60 hover:ring-border hover:bg-muted/30 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div
                        onClick={() => !isOutOfStock && toggleVariant(variant)}
                        className={`p-3.5 sm:p-4 flex items-center gap-3.5 ${
                          isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }`}
                      >
                        {/* Selection indicator */}
                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          selected
                            ? 'border-primary bg-primary scale-110'
                            : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm sm:text-[15px] truncate ${
                              selected ? 'text-primary' : 'text-foreground'
                            }`}>
                              {variantName}
                            </span>
                            {(variant.sku || variant.barcode) && (
                              <span className="shrink-0 text-[10px] text-muted-foreground/60 bg-muted/60 px-1.5 py-px rounded">
                                {variant.sku || variant.barcode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${stockColor}`} />
                            <span className={`text-xs font-medium ${stockTextColor}`}>
                              {isOutOfStock ? 'Habis' : `Stok ${stock}`}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <div className={`font-bold text-sm sm:text-[15px] tabular-nums ${
                            selected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {formatRupiah(price)}
                          </div>
                          {price !== basePrice && (
                            <div className="text-[10px] text-muted-foreground/70 line-through tabular-nums">
                              {formatRupiah(basePrice)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity stepper */}
                      <AnimatePresence>
                        {selected && (
                          <motion.div
                            initial={isMobile ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={isMobile ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={{ duration: isMobile ? 0.1 : 0.2 }}
                            className="overflow-hidden border-t border-primary/10"
                          >
                            <div className="px-4 py-3 flex items-center justify-between bg-primary/[0.03]">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Jumlah
                                </span>
                                <span className="text-[10px] text-muted-foreground/50">
                                  Max: {variant.stockQuantity || variant.stock_quantity || 0}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQuantity(variant.id, -1) }}
                                  disabled={getSelectedQuantity(variant.id) <= 1}
                                  className="w-8 h-8 rounded-l-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-9 h-8 border-y border-border bg-background flex items-center justify-center text-sm font-bold tabular-nums">
                                  {getSelectedQuantity(variant.id)}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQuantity(variant.id, 1) }}
                                  disabled={getSelectedQuantity(variant.id) >= (variant.stockQuantity || variant.stock_quantity || 0)}
                                  className="w-8 h-8 rounded-r-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}

                {/* Load More */}
                {hasMoreVariants && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 15)}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-xl border border-dashed border-border flex items-center justify-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      {Math.min(variants.length - displayLimit, 15)} varian lagi
                      <span className="text-muted-foreground/50 ml-1">({variants.length - displayLimit} tersisa)</span>
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ══════ SUMMARY & FOOTER ══════ */}
          <AnimatePresence>
            {selectedVariants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                className="overflow-hidden shrink-0"
              >
                <div className="mx-3 sm:mx-4 mb-2 p-3 rounded-xl bg-primary/[0.05] border border-primary/15">
                  {selectedVariants.map(({ variant, quantity }) => {
                    const vName = variant.variantName || variant.variant_name
                    const vPrice = variant.price || basePrice
                    const subtotal = vPrice * quantity
                    return (
                      <div key={variant.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded tabular-nums">
                            {quantity}x
                          </span>
                          <span className="text-xs font-medium truncate">{vName}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums shrink-0 ml-2">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Total {totalSelectedItems} item
                    </span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatRupiah(totalSelectedPrice)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════ FOOTER ══════ */}
          <div className="px-4 sm:px-5 py-4 border-t border-border/60 bg-muted/20 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted transition text-sm font-medium shadow-sm"
            >
              Batal
            </button>
            <motion.button
              onClick={handleAddToCart}
              disabled={selectedVariants.length === 0 || variants.length === 0 || isAddingToCart}
              whileHover={!isMobile && selectedVariants.length > 0 ? { scale: 1.02 } : {}}
              whileTap={selectedVariants.length > 0 && !isAddingToCart ? { scale: 0.98 } : {}}
              className="flex-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition text-sm font-semibold shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isAddingToCart ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/50 border-t-primary-foreground animate-spin" />
                  <span>Menambahkan...</span>
                </>
              ) : selectedVariants.length > 0 ? (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Tambah ke Pesanan</span>
                  <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums">
                    {totalSelectedItems}
                  </span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Pilih Varian</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
