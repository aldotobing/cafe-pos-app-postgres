"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useMenu, useCafeSettings } from "@/hooks/use-cafe-data";
import { formatRupiah } from "../../lib/format";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ShoppingCart, Loader2, Minus, Plus } from "lucide-react";
import { ReceiptModal } from "../receipt/receipt-modal";

export function MobileCart() {
  const { user, userData } = useAuth();
  const { cart, increaseQty, decreaseQty, setItemNote, setItemDiscount, clearCart, checkout } = useCart();
  const { menu } = useMenu(userData?.cafe_id);
  const { settings } = useCafeSettings(userData?.cafe_id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [payment, setPayment] = useState<any>('Tunai');
  const [orderNote, setOrderNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [focusedDiscountId, setFocusedDiscountId] = useState<string | null>(null);
  const router = useRouter();

  // Calculate cart totals
  const subtotal = cart.reduce((sum, c) => sum + Math.max(0, c.price * c.qty - (c.discount ?? 0)), 0);
  const tax = Math.round(((settings?.taxPercent || 0) / 100) * subtotal);
  const service = Math.round(((settings?.servicePercent || 0) / 100) * subtotal);
  const total = subtotal + tax + service;

  // Close when cart becomes empty
  useEffect(() => {
    if (cart.length === 0 && isExpanded) {
      setIsExpanded(false);
    }
  }, [cart.length, isExpanded]);

  // Count total items in cart
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Animation for the cart icon jump
  const [controls, setControls] = useState({ scale: 1 });

  useEffect(() => {
    if (totalItems > 0) {
      setControls({ scale: [1, 1.1, 1] } as any);
      const timer = setTimeout(() => setControls({ scale: 1 }), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  return (
    <div className="w-full fixed bottom-20 left-0 right-0 z-50 px-4">
      {/* Compact cart view - shown when collapsed */}
      <AnimatePresence>
        {!isExpanded && cart.length > 0 && (
          <motion.div
            className="bg-primary text-primary-foreground rounded-lg p-3 shadow-lg cursor-pointer"
            initial={{ y: 20, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: controls.scale
            }}
            transition={{
              scale: { duration: 0.3, ease: "easeOut" }
            }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={totalItems > 0 ? { rotate: [0, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <ShoppingCart className="h-5 w-5" />
                </motion.div>
                <span className="font-medium">Keranjang</span>
              </div>
              <div className="flex items-center gap-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="bg-primary-foreground text-primary rounded-full min-w-[1.75rem] h-7 flex items-center justify-center text-xs font-bold px-1"
                  >
                    {totalItems}
                  </motion.span>
                </AnimatePresence>
                <span className="font-semibold">{formatRupiah(total)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded cart view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-x-0 bottom-0 bg-background border-t rounded-t-lg shadow-xl z-50 flex flex-col max-h-[90vh]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Cart header */}
            <div className="flex items-center justify-between p-3 border-b bg-card">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h3 className="font-semibold">Keranjang</h3>
              </div>
              <div className="flex items-center gap-4">
                {cart.length > 0 && (
                  <button
                    className="text-sm text-destructive hover:underline"
                    onClick={() => {
                      clearCart();
                    }}
                  >
                    Hapus Semua
                  </button>
                )}
                <button
                  className="p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Minimize cart"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Cart items */}
            <div className="overflow-y-auto p-3 space-y-3 flex-grow max-h-[40vh]">
              {cart.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Belum ada item.</div>
              ) : (
                cart.map((c) => {
                  const itemKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
                  return (
                    <div key={itemKey} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate max-w-[60%]">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{formatRupiah(c.price)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="px-2 py-1 rounded-md border text-sm"
                            onClick={() => {
                              decreaseQty(c.menuId, c.variantId);
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{c.qty}</span>
                          <button
                            className="px-2 py-1 rounded-md border text-sm"
                            onClick={() => {
                              const menuItem = menu.find(m => m.id === c.menuId);
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
                        <div className="text-sm font-semibold">
                          {formatRupiah(Math.max(0, c.price * c.qty - (c.discount ?? 0)))}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                          placeholder="Catatan item"
                          value={c.note ?? ""}
                          onChange={(e) => {
                            setItemNote(c.menuId, e.target.value, c.variantId);
                          }}
                        />
                        <div className="relative">
                          <input
                            type="number"
                            className={`w-full rounded-md border bg-background px-2 py-1 text-xs ${!focusedDiscountId && (c.discount === 0 || c.discount === null || c.discount === undefined) ? 'text-transparent' : ''}`}
                            placeholder="Diskon (Rp)"
                            value={focusedDiscountId === itemKey && (c.discount === 0 || c.discount === null || c.discount === undefined) ? '' : (c.discount ?? 0)}
                            min={0}
                            onChange={(e) => {
                              setItemDiscount(c.menuId, Number(e.target.value) || 0, c.variantId);
                            }}
                            onFocus={() => setFocusedDiscountId(itemKey)}
                            onBlur={() => setFocusedDiscountId(null)}
                          />
                          {!focusedDiscountId && (c.discount === 0 || c.discount === null || c.discount === undefined) && (
                            <div className="absolute inset-0 flex items-center px-2 text-xs text-muted-foreground pointer-events-none">
                              Diskon (Rp)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          className="text-xs text-destructive hover:underline"
                          onClick={() => {
                            decreaseQty(c.menuId, c.variantId); // This will remove the item when qty reaches 0
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart summary and checkout */}
            <div className="p-3 border-t bg-card">
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PPN ({settings?.taxPercent || 0}%)</span>
                  <span>{formatRupiah(tax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service ({settings?.servicePercent || 0}%)</span>
                  <span>{formatRupiah(service)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>{formatRupiah(total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 mb-3">
                <select
                  aria-label="Metode Pembayaran"
                  className="rounded-md border bg-background px-2 py-2 text-sm w-full"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value as any)}
                >
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Debit">Debit</option>
                  <option value="Transfer">Transfer</option>
                </select>
                <input
                  className="rounded-md border bg-background px-2 py-2 text-sm w-full"
                  placeholder="Catatan pesanan (opsional)"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-md bg-primary text-primary-foreground py-2.5 font-bold text-base disabled:opacity-50 transition-transform hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                disabled={cart.length === 0 || isProcessing}
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    const menuMap = new Map(menu.map((m: any) => [m.id, m]));
                    const tx = await checkout(payment, orderNote, user?.id, userData?.full_name, userData?.cafe_id || 1, settings, menuMap);
                    if (tx) {
                      toast.success('Transaksi berhasil disimpan!', {
                        description: `Total: ${formatRupiah(tx.totalAmount || tx.total_amount || 0)}`
                      })
                      setReceiptTransactionId(tx.id)
                      setShowReceiptModal(true)
                    }
                  } finally {
                    setIsProcessing(false);
                    setIsExpanded(false);
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
          </motion.div>
        )}
      </AnimatePresence>

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
  );
}