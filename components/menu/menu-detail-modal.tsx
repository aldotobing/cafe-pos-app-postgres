"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Pencil } from "lucide-react"
import { useCategories } from "@/hooks/use-cafe-data"
import { useAuth } from "@/lib/auth-context"
import { formatRupiah } from "@/lib/utils"
import { useState, useEffect } from "react"
import type { ProductVariant } from "@/types"

interface MenuDetailModalProps {
  menuItem: any;
  onClose: () => void;
  onEdit: (item: any) => void;
  canEdit: boolean;
}

export function MenuDetailModal({ menuItem, onClose, onEdit, canEdit }: MenuDetailModalProps) {
  const { userData } = useAuth();
  const { categories } = useCategories(userData?.cafe_id);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'variants'>('info');

  // Load variants when modal opens for items with hasVariants
  useEffect(() => {
    if (menuItem?.hasVariants || menuItem?.has_variants) {
      loadVariants();
    }
  }, [menuItem?.id]);

  const loadVariants = async () => {
    if (!menuItem?.id) return;
    setIsLoadingVariants(true);
    try {
      const response = await fetch(`/api/rest/product_variants?menu_id=${menuItem.id}`);
      const data = await response.json();
      const variantsList = Array.isArray(data) ? data : (data.data || data.results || []);
      // Filter active variants
      const activeVariants = variantsList.filter((v: ProductVariant) =>
        v.is_active !== 0 && v.isActive !== false
      );
      setVariants(activeVariants);
    } catch (error) {
      console.error('Failed to load variants:', error);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const hasVariants = menuItem?.hasVariants || menuItem?.has_variants || variants.length > 0;
  const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock_quantity || v.stockQuantity || 0), 0);
  const hasVariantStockTracking = variants.some(v => v.track_stock || v.trackStock);

  if (!menuItem) return null;

  return (
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

      {/* Modal Content */}
      <motion.div
        className="relative w-full max-w-md sm:max-w-lg bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base sm:text-lg truncate">{menuItem.name}</h3>
            <p className="text-xs text-muted-foreground">
              {categories.find(c => c.id === menuItem.categoryId)?.name || (menuItem.category && String(menuItem.category)) || 'Tanpa Kategori'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {canEdit && (
              <button
                onClick={() => onEdit(menuItem)}
                className="p-1.5 sm:p-2 rounded-lg border hover:bg-muted transition"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Image Section */}
        {menuItem.imageUrl ? (
          <div className="w-full h-40 sm:h-48 bg-muted overflow-hidden shrink-0">
            <img
              src={menuItem.imageUrl}
              alt={menuItem.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        {/* Tabs for variant products */}
        {hasVariants && (
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Informasi
            </button>
            <button
              onClick={() => setActiveTab('variants')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'variants'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isLoadingVariants ? 'Varian ...' : `Varian (${variants.length})`}
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'info' ? (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    menuItem.available
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {menuItem.available ? 'Tersedia' : 'Nonaktif'}
                  </span>
                  {hasVariants && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600">
                      Produk Varian
                    </span>
                  )}
                  {menuItem.trackStock && !hasVariants && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                      Tracking Stok
                    </span>
                  )}
                </div>

                {/* Pricing Section */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Harga Jual</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatRupiah(menuItem.price)}
                    </span>
                  </div>

                  {menuItem.hppPrice > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">HPP (Modal)</span>
                        <span className="font-medium">{formatRupiah(menuItem.hppPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Margin</span>
                        <span className="font-medium text-emerald-600">
                          {menuItem.marginPercent?.toFixed(1) || '0'}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Laba/Unit</span>
                        <span className="font-medium text-emerald-600">
                          +{formatRupiah(menuItem.price - menuItem.hppPrice)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock Section - Non Variant */}
                {menuItem.trackStock && !hasVariants && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stok Tersedia</span>
                      <span className={`text-lg font-bold ${
                        (menuItem.stockQuantity || 0) <= (menuItem.minStock || 5)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {menuItem.stockQuantity || 0} unit
                      </span>
                    </div>
                    {(menuItem.stockQuantity || 0) <= (menuItem.minStock || 5) && (
                      <p className="text-xs text-amber-600 mt-2">
                        Stok mendekati minimum ({menuItem.minStock || 5} unit)
                      </p>
                    )}
                  </div>
                )}

                {/* Stock Summary for Variants */}
                {hasVariants && hasVariantStockTracking && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Stok Varian</span>
                      <span className={`text-lg font-bold ${
                        totalVariantStock === 0
                          ? 'text-red-600'
                          : totalVariantStock <= (menuItem.minStock || 5)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {totalVariantStock} unit
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Dari {variants.length} varian aktif
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="variants"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Variants List */}
                {isLoadingVariants ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground mt-3">Memuat varian...</p>
                  </div>
                ) : variants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Tidak ada varian aktif</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variants.map((variant) => {
                      const stock = variant.stock_quantity || variant.stockQuantity || 0;
                      const isTracking = variant.track_stock || variant.trackStock;
                      const isOutOfStock = isTracking && stock === 0;
                      const isLowStock = isTracking && stock <= (variant.min_stock || variant.minStock || 5);
                      const price = variant.price || menuItem.price;

                      return (
                        <div
                          key={variant.id}
                          className={`p-3 sm:p-4 rounded-lg border ${
                            isOutOfStock ? 'border-red-200 bg-red-50/50' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base">
                                {variant.variant_name || variant.variantName}
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
                              {isTracking && (
                                <div className={`text-xs mt-0.5 ${
                                  isOutOfStock ? 'text-red-600 font-medium' :
                                  isLowStock ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {isOutOfStock ? 'Habis' : `Stok ${stock}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* Last Updated */}
          {menuItem.updatedAt && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Terakhir diperbarui: {new Date(menuItem.updatedAt).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
