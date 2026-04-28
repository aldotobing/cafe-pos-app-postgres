"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "../../contexts/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useMenu, useCafeSettings } from "@/hooks/use-cafe-data"
import { formatRupiah } from "../../lib/format"
import { toast } from "sonner"
import { ReceiptModal } from "../receipt/receipt-modal"
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react"

export function CartPanel() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const {
    cart,
    increaseQty,
    decreaseQty,
    setItemNote,
    setItemDiscount,
    clearCart,
    checkout,
  } = useCart()
  const { menu } = useMenu(userData?.cafe_id)
  const { settings } = useCafeSettings(userData?.cafe_id)

  const [payment, setPayment] = useState<any>('Tunai')
  const [orderNote, setOrderNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [focusedDiscountId, setFocusedDiscountId] = useState<string | null>(null)

  const subtotal = cart.reduce((sum: number, c: any) => sum + Math.max(0, c.price * c.qty - (c.discount ?? 0)), 0)
  const tax = Math.round(((settings?.taxPercent || 0) / 100) * subtotal)
  const service = Math.round(((settings?.servicePercent || 0) / 100) * subtotal)
  const total = subtotal + tax + service

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-base">Keranjang</h3>
        {cart.length > 0 && (
          <button
            className="text-xs text-destructive/80 hover:text-destructive transition-colors flex items-center gap-1"
            onClick={clearCart}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Semua
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-custom">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <ShoppingCart className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div className="text-sm font-medium text-foreground">Keranjang kosong</div>
            <div className="text-xs text-muted-foreground mt-0.5">Pilih item dari menu untuk memulai</div>
          </div>
        )}
        {cart.length > 0 && (
          <div className="space-y-2.5">
            {cart.map((c: any) => (
              <div key={`${c.menuId}-${c.variantId || ''}`} className="rounded-xl border bg-background p-3 group hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="text-sm font-medium leading-tight truncate flex-1">
                    {c.name}
                    {c.variantName && (
                      <span className="ml-1 text-xs text-muted-foreground">({c.variantName})</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{formatRupiah(c.price)}</div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => decreaseQty(c.menuId, c.variantId)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-medium">{c.qty}</span>
                    <button
                      className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => {
                        const menuItem = (menu as any[]).find((m: any) => m.id === c.menuId);
                        const maxStock = menuItem?.trackStock ? (menuItem.stockQuantity || 0) : Infinity;

                        if (c.qty + 1 > maxStock) {
                          toast.error(`Stok ${c.name} tidak mencukupi! Tersisa: ${maxStock - c.qty}`);
                          return;
                        }

                        increaseQty(c.menuId, c.variantId);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-lg border bg-card px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                    placeholder="Catatan"
                    value={c.note ?? ""}
                    onChange={(e) => setItemNote(c.menuId, e.target.value, c.variantId)}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      className={`w-full rounded-lg border bg-card px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all ${!focusedDiscountId && (c.discount === 0 || c.discount === null || c.discount === undefined) ? 'text-transparent' : ''}`}
                      value={focusedDiscountId === `${c.menuId}-${c.variantId || ''}` ? (c.discount || '') : (c.discount ?? 0)}
                      min={0}
                      onChange={(e) => setItemDiscount(c.menuId, Number(e.target.value) || 0, c.variantId)}
                      onFocus={() => setFocusedDiscountId(`${c.menuId}-${c.variantId || ''}`)}
                      onBlur={() => setFocusedDiscountId(null)}
                    />
                    {!focusedDiscountId && (c.discount === 0 || c.discount === null || c.discount === undefined) && (
                      <div className="absolute inset-0 flex items-center px-2.5 text-xs text-muted-foreground/60 pointer-events-none">
                        Diskon
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t/60">
                  <button
                    className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive transition-colors"
                    onClick={() => decreaseQty(c.menuId, c.variantId)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    <span>Hapus</span>
                  </button>
                  <div className="text-sm font-semibold">{formatRupiah(Math.max(0, c.price * c.qty - (c.discount ?? 0)))}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary & Checkout */}
      <div className="border-t px-4 py-3 space-y-3 bg-card">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>PPN ({settings?.taxPercent || 0}%)</span>
            <span>{formatRupiah(tax)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Service ({settings?.servicePercent || 0}%)</span>
            <span>{formatRupiah(service)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold border-t pt-2 mt-1.5">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Metode Pembayaran"
            className="rounded-lg border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            value={payment}
            onChange={(e) => setPayment(e.target.value as any)}
          >
            <option value="Tunai">Tunai</option>
            <option value="QRIS">QRIS</option>
            <option value="Debit">Debit</option>
            <option value="Transfer">Transfer</option>
          </select>
          <input
            className="rounded-lg border bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            placeholder="Catatan"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
          />
        </div>

        <button
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          disabled={cart.length === 0 || isProcessing}
          onClick={async () => {
            setIsProcessing(true);
            try {
              const menuMap = new Map((menu as any[]).map((m: any) => [m.id, m]));
              const tx = await checkout(payment, orderNote, user?.id, userData?.full_name, userData?.cafe_id, settings, menuMap)
              if (tx) {
                toast.success('Transaksi berhasil!', {
                  description: `Total: ${formatRupiah(tx.totalAmount || tx.total_amount || 0)}`,
                  action: {
                    label: 'Lihat Struk',
                    onClick: () => {
                      setReceiptTransactionId(tx.id)
                      setShowReceiptModal(true)
                    }
                  }
                })
                setReceiptTransactionId(tx.id)
                setShowReceiptModal(true)
              }
            } finally {
              setIsProcessing(false);
            }
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            "Bayar & Cetak"
          )}
        </button>
      </div>

      {/* Receipt Modal */}
      {receiptTransactionId && (
        <ReceiptModal
          transactionId={receiptTransactionId}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setReceiptTransactionId(null)
          }}
        />
      )}
    </div>
  )
}
