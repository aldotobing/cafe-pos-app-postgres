"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ClipboardCheck, Loader2, AlertTriangle, Info } from "lucide-react"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/format"

interface StockOpnameDialogProps {
  isOpen: boolean
  onClose: () => void
  menuItems: Array<{
    id: string
    name: string
    category: string
    stockQuantity?: number
    hppPrice?: number
    minStock?: number
    trackStock?: boolean
    hasVariants?: boolean
  }>
  variantsMap?: Record<string, Array<{
    id: string
    variant_name: string
    stock_quantity: number
    hpp_price: number
  }>>
  userId?: string
  cafeId?: number | null
  onComplete: (results: Array<{ menuId: string, actualQty: number, notes?: string, variantId?: string }>) => Promise<void>
}

export function StockOpnameDialog({ isOpen, onClose, menuItems, variantsMap, userId, cafeId, onComplete }: StockOpnameDialogProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const itemsWithStock = menuItems.filter(m => m.trackStock)

  // Initialize counts when dialog opens
  useEffect(() => {
    if (isOpen) {
      handleOpen();
    }
  }, [isOpen]);

  // Refresh counts when menuItems or variantsMap changes (e.g., after restock/opname)
  useEffect(() => {
    if (isOpen && (menuItems.length > 0 || Object.keys(variantsMap || {}).length > 0)) {
      handleOpen();
    }
  }, [menuItems, variantsMap]);

  // Initialize counts with current system stock
  const handleOpen = () => {
    const initialCounts: Record<string, number> = {}
    itemsWithStock.forEach(m => {
      // For items with variants, initialize each variant count
      if (m.hasVariants && variantsMap && variantsMap[m.id]) {
        variantsMap[m.id].forEach(v => {
          initialCounts[v.id] = v.stock_quantity || 0
        })
      } else {
        initialCounts[m.id] = m.stockQuantity || 0
      }
    })
    setCounts(initialCounts)
    setNotes({})
  }

  const handleClose = () => {
    setCounts({})
    setNotes({})
    onClose()
  }

  const handleSubmit = async () => {
    const results: Array<{ menuId: string, actualQty: number, notes?: string, variantId?: string }> = []

    itemsWithStock.forEach(m => {
      if (m.hasVariants && variantsMap && variantsMap[m.id]) {
        // For items with variants, add each variant
        variantsMap[m.id].forEach(v => {
          results.push({
            menuId: m.id,
            actualQty: counts[v.id] || 0,
            notes: notes[v.id] || undefined,
            variantId: v.id,
          })
        })
      } else {
        // For items without variants
        results.push({
          menuId: m.id,
          actualQty: counts[m.id] || 0,
          notes: notes[m.id] || undefined,
        })
      }
    })

    setIsProcessing(true)
    try {
      await onComplete(results)
      toast.success("Stock opname berhasil disimpan")
      handleClose()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan stock opname")
    } finally {
      setIsProcessing(false)
    }
  }

  const totalVariance = itemsWithStock.reduce((sum, m) => {
    if (m.hasVariants && variantsMap && variantsMap[m.id]) {
      // For items with variants, sum up variant variances
      return sum + variantsMap[m.id].reduce((variantSum: number, v: any) => {
        const systemQty = v.stock_quantity || 0
        const actualQty = counts[v.id] || 0
        return variantSum + (actualQty - systemQty)
      }, 0)
    } else {
      // For items without variants
      const systemQty = m.stockQuantity || 0
      const actualQty = counts[m.id] || 0
      return sum + (actualQty - systemQty)
    }
  }, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-full max-w-4xl max-h-[90vh] bg-card border rounded-xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold">Stock Opname</h3>
                  <p className="text-xs text-muted-foreground">Hitung fisik stok dan sesuaikan dengan sistem</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-1.5 rounded-md hover:bg-muted/80 transition text-muted-foreground/60 hover:text-muted-foreground"
                    title="Panduan Stock Opname"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-md hover:bg-muted transition"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Info Tooltip */}
              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-600">
                          <p className="font-medium">Panduan Stock Opname:</p>
                          <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                            <li>Masukkan jumlah fisik yang sebenarnya dihitung</li>
                            <li>Sistem akan otomatis menyesuaikan stok</li>
                            <li>Selisih akan dicatat sebagai penyesuaian</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {/* Desktop Table */}
                  <table className="w-full text-sm hidden md:table">
                    <thead className="sticky top-0 bg-card z-10 border-b">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Item</th>
                        <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Stok Sistem</th>
                        <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Hitung Fisik</th>
                        <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Selisih</th>
                        <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsWithStock.flatMap((m) => {
                        const variants = m.hasVariants && variantsMap && variantsMap[m.id] ? variantsMap[m.id] : null;

                        // If no variants, show single row
                        if (!variants || variants.length === 0) {
                          const systemQty = m.stockQuantity || 0
                          const actualQty = counts[m.id] || 0
                          const variance = actualQty - systemQty
                          const hasVariance = variance !== 0

                          return (
                            <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/20">
                              <td className="px-4 py-3">
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-muted-foreground">{m.category && String(m.category) || 'Tanpa Kategori'}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-bold">{systemQty}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={counts[m.id] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCounts(prev => ({
                                      ...prev,
                                      [m.id]: val === '' ? 0 : Number(val)
                                    }))
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                  }}
                                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="0"
                                />
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${
                                variance > 0 ? 'text-emerald-500' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'
                              }`}>
                                {hasVariance ? (variance > 0 ? '+' : '') + variance : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={notes[m.id] || ''}
                                  onChange={(e) => setNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                  placeholder="Opsional..."
                                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </td>
                            </tr>
                          );
                        }

                        // If has variants, show parent row with variants indented below
                        const rows = [];

                        // Parent row (shows aggregated info)
                        const totalSystemStock = variants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
                        const totalActualStock = variants.reduce((sum: number, v: any) => sum + (counts[v.id] || 0), 0);
                        const totalVariance = totalActualStock - totalSystemStock;
                        const hasTotalVariance = totalVariance !== 0;

                        rows.push(
                          <tr key={m.id} className="border-b last:border-b-0 bg-muted/30">
                            <td className="px-4 py-2.5">
                              <div className="font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">({variants.length} varian)</div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold">{totalSystemStock}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">-</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${
                              hasTotalVariance ? (totalVariance > 0 ? 'text-emerald-500' : 'text-red-500') : 'text-muted-foreground'
                            }`}>
                              {hasTotalVariance ? (totalVariance > 0 ? '+' : '') + totalVariance : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">-</td>
                          </tr>
                        );

                        // Variant rows (indented)
                        variants.forEach((v: any) => {
                          const systemQty = v.stock_quantity || 0
                          const actualQty = counts[v.id] || 0
                          const variance = actualQty - systemQty
                          const hasVariance = variance !== 0

                          rows.push(
                            <tr key={`${m.id}-${v.id}`} className="border-b last:border-b-0 hover:bg-muted/20">
                              <td className="px-4 py-2.5 pl-8 text-muted-foreground text-xs">
                                └ {v.variant_name || v.id}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-sm">{systemQty}</td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={counts[v.id] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCounts(prev => ({
                                      ...prev,
                                      [v.id]: val === '' ? 0 : Number(val)
                                    }))
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="0"
                                />
                              </td>
                              <td className={`px-4 py-2.5 text-right font-bold text-sm ${
                                variance > 0 ? 'text-emerald-500' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'
                              }`}>
                                {hasVariance ? (variance > 0 ? '+' : '') + variance : '-'}
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={notes[v.id] || ''}
                                  onChange={(e) => setNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                                  placeholder="Opsional..."
                                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </td>
                            </tr>
                          );
                        });

                        return rows;
                      })}
                    </tbody>
                  </table>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-3">
                    {itemsWithStock.flatMap((m) => {
                      const variants = m.hasVariants && variantsMap && variantsMap[m.id] ? variantsMap[m.id] : null;

                      // If no variants, show single card
                      if (!variants || variants.length === 0) {
                        const systemQty = m.stockQuantity || 0
                        const actualQty = counts[m.id] || 0
                        const variance = actualQty - systemQty
                        const hasVariance = variance !== 0

                        return (
                          <div key={m.id} className="bg-card border rounded-lg p-3 space-y-3">
                            <div>
                              <div className="font-medium text-sm">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.category ? String(m.category) : 'Tanpa Kategori'}</div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stok Sistem</div>
                                <div className="font-bold text-lg">{systemQty}</div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hitung Fisik</div>
                                <input
                                  type="number"
                                  min={0}
                                  value={counts[m.id] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCounts(prev => ({
                                      ...prev,
                                      [m.id]: val === '' ? 0 : Number(val)
                                    }))
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 mx-auto rounded-md border bg-background px-2 py-1.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="0"
                                />
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Selisih</div>
                                <div className={`font-bold text-lg ${
                                  variance > 0 ? 'text-emerald-500' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {hasVariance ? (variance > 0 ? '+' : '') + variance : '-'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={notes[m.id] || ''}
                                onChange={(e) => setNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                placeholder="Catatan opsional..."
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          </div>
                        );
                      }

                      // If has variants, show parent card with variant cards below
                      const cards = [];

                      // Parent card (shows aggregated info)
                      const totalSystemStock = variants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
                      const totalActualStock = variants.reduce((sum: number, v: any) => sum + (counts[v.id] || 0), 0);
                      const totalVariance = totalActualStock - totalSystemStock;
                      const hasTotalVariance = totalVariance !== 0;

                      cards.push(
                        <div key={m.id} className="bg-muted/30 border rounded-lg p-3 space-y-2">
                          <div>
                            <div className="font-medium text-sm">{m.name}</div>
                            <div className="text-xs text-muted-foreground">({variants.length} varian)</div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-center">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Sistem</div>
                              <div className="font-bold text-lg">{totalSystemStock}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Selisih</div>
                              <div className={`font-bold text-lg ${
                                hasTotalVariance ? (totalVariance > 0 ? 'text-emerald-500' : 'text-red-500') : 'text-muted-foreground'
                              }`}>
                                {hasTotalVariance ? (totalVariance > 0 ? '+' : '') + totalVariance : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );

                      // Variant cards
                      variants.forEach((v: any) => {
                        const systemQty = v.stock_quantity || 0
                        const actualQty = counts[v.id] || 0
                        const variance = actualQty - systemQty
                        const hasVariance = variance !== 0

                        cards.push(
                          <div key={`${m.id}-${v.id}`} className="bg-card border rounded-lg p-3 space-y-3 ml-4">
                            <div>
                              <div className="font-medium text-sm text-muted-foreground">└ {v.variant_name || v.id}</div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stok Sistem</div>
                                <div className="font-bold text-lg">{systemQty}</div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hitung Fisik</div>
                                <input
                                  type="number"
                                  min={0}
                                  value={counts[v.id] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCounts(prev => ({
                                      ...prev,
                                      [v.id]: val === '' ? 0 : Number(val)
                                    }))
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 mx-auto rounded-md border bg-background px-2 py-1.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="0"
                                />
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Selisih</div>
                                <div className={`font-bold text-lg ${
                                  variance > 0 ? 'text-emerald-500' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {hasVariance ? (variance > 0 ? '+' : '') + variance : '-'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={notes[v.id] || ''}
                                onChange={(e) => setNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                                placeholder="Catatan opsional..."
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          </div>
                        );
                      });

                      return cards;
                    })}
                  </div>
                  {totalVariance !== 0 && (
                    <div className="sticky bottom-0 bg-muted/30 border-t px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Total Selisih</span>
                        <span className={`font-bold text-lg ${
                          totalVariance > 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {totalVariance > 0 ? '+' : ''}{totalVariance}
                        </span>
                      </div>
                    </div>
                  )}
                  {itemsWithStock.length === 0 && (
                    <div className="px-4 py-12 text-center text-muted-foreground">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <div className="text-sm font-medium">Tidak ada item dengan tracking stok</div>
                      <div className="text-xs mt-1">Aktifkan "Track Stok" pada menu item terlebih dahulu</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-4 border-t bg-muted/20">
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Menyimpan...</span>
                      <span className="sm:hidden">Simpan...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4 hidden sm:block" />
                      <span>Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
