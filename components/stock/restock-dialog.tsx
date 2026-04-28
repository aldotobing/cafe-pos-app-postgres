"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, PackagePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/format"

interface RestockDialogProps {
  isOpen: boolean
  onClose: () => void
  menuItem: {
    id: string
    name: string
    category: string
    stockQuantity?: number
    hppPrice?: number
    minStock?: number
    variantId?: string
    variantName?: string
  } | null
  onRestock: (menuId: string, quantity: number, hppPrice?: number, notes?: string, variantId?: string) => Promise<void>
}

export function RestockDialog({ isOpen, onClose, menuItem, onRestock }: RestockDialogProps) {
  const [quantity, setQuantity] = useState(0)
  const [updateHpp, setUpdateHpp] = useState(false)
  const [hppPrice, setHppPrice] = useState(0)
  const [notes, setNotes] = useState("")
  const [isRestocking, setIsRestocking] = useState(false)

  const handleRestock = async () => {
    if (!menuItem || quantity <= 0) {
      toast.error("Jumlah stok harus lebih dari 0")
      return
    }

    setIsRestocking(true)
    try {
      await onRestock(
        menuItem.id,
        quantity,
        updateHpp ? hppPrice : undefined,
        notes || undefined,
        menuItem.variantId
      )
      const itemName = menuItem.variantName ? `${menuItem.name} (${menuItem.variantName})` : menuItem.name
      toast.success(`${itemName} berhasil di-restock +${quantity}`)
      handleClose()
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan restock")
    } finally {
      setIsRestocking(false)
    }
  }

  const handleClose = () => {
    setQuantity(0)
    setUpdateHpp(false)
    setHppPrice(0)
    setNotes("")
    onClose()
  }

  if (!menuItem) return null

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
            <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">
                    Restock: {menuItem.name}
                    {menuItem.variantName && (
                      <span className="text-muted-foreground font-normal ml-1">({menuItem.variantName})</span>
                    )}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-md hover:bg-muted transition"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Current Stock Info */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stok Saat Ini</span>
                    <span className="font-bold">{menuItem.stockQuantity || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Min. Stok</span>
                    <span>{menuItem.minStock || 5}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">HPP Saat Ini</span>
                    <span>{formatRupiah(menuItem.hppPrice || 0)}</span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Jumlah Stok Masuk
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity || ""}
                    onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                    placeholder="Masukkan jumlah..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  {quantity > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Stok baru: <span className="font-bold text-primary">{(menuItem.stockQuantity || 0) + quantity}</span>
                    </div>
                  )}
                </div>

                {/* Update HPP Toggle */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={updateHpp}
                    onChange={(e) => setUpdateHpp(e.target.checked)}
                    className="rounded border bg-background"
                  />
                  <span className="text-sm">Update HPP (opsional)</span>
                </label>

                {/* HPP Input (conditional) */}
                {updateHpp && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      HPP Baru (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={hppPrice || ""}
                      onChange={(e) => setHppPrice(Number(e.target.value) || 0)}
                      placeholder="Harga pokok baru..."
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Catatan (opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Pembelian dari supplier ABC..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-4 border-t bg-muted/20">
                <button
                  onClick={handleClose}
                  disabled={isRestocking}
                  className="flex-1 px-4 py-2 rounded-md border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleRestock}
                  disabled={isRestocking || quantity <= 0}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRestocking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Restock...</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus className="h-4 w-4" />
                      <span>Restock +{quantity}</span>
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
