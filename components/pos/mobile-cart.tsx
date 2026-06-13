"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useMenu, useCafeSettings, usePromotions } from "@/hooks/use-cafe-data";
import { formatRupiah } from "../../lib/format";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ShoppingCart, Loader2, Minus, Plus } from "lucide-react";
import { ReceiptModal } from "../receipt/receipt-modal";
import { findBestPromo, type PromoRule } from "@/lib/promo-matcher";

// Memoized cart item untuk mengurangi re-renders
const MemoizedCartItem = memo(function CartItem({ 
  item, 
  menu,
  onDecrease, 
  onIncrease, 
  onSetNote, 
  onSetDiscount,
  focusedDiscountId,
  onSetFocusedDiscountId
}: {
  item: any;
  menu: any[];
  onDecrease: (menuId: string, variantId?: string) => void;
  onIncrease: (menuId: string, variantId?: string) => void;
  onSetNote: (menuId: string, note: string, variantId?: string) => void;
  onSetDiscount: (menuId: string, discount: number, variantId?: string) => void;
  focusedDiscountId: string | null;
  onSetFocusedDiscountId: (id: string | null) => void;
}) {
  const itemKey = item.variantId ? `${item.menuId}-${item.variantId}` : item.menuId;
  
  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium truncate max-w-[60%]">
          {item.name}
          {item.variantName && (
            <span className="ml-1 text-xs text-muted-foreground">({item.variantName})</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{formatRupiah(item.price)}</div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1">
          <button
            className="px-2 py-1 rounded-md border text-sm active:scale-95 transition-transform"
            onClick={() => onDecrease(item.menuId, item.variantId)}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-sm">{item.qty}</span>
          <button
            className="px-2 py-1 rounded-md border text-sm active:scale-95 transition-transform"
            onClick={() => {
              const menuItem = menu.find(m => m.id === item.menuId);
              const maxStock = menuItem?.trackStock ? (menuItem.stockQuantity || 0) : Infinity;

              if (item.qty + 1 > maxStock) {
                toast.error(`Stok ${item.name} tidak mencukupi! Tersisa: ${maxStock - item.qty}`, { id: "cart-stock" });
                return;
              }

              onIncrease(item.menuId, item.variantId);
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="text-sm font-semibold">
          {formatRupiah(Math.max(0, item.price * item.qty - (item.discount ?? 0)))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2">
        <input
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
          placeholder="Catatan item"
          value={item.note ?? ""}
          onChange={(e) => onSetNote(item.menuId, e.target.value, item.variantId)}
        />
        <div className="relative">
          <input
            type="number"
            className={`w-full rounded-md border bg-background px-2 py-1 text-xs ${!focusedDiscountId && (item.discount === 0 || item.discount === null || item.discount === undefined) ? 'text-transparent' : ''}`}
            placeholder="Diskon (Rp)"
            value={focusedDiscountId === itemKey && (item.discount === 0 || item.discount === null || item.discount === undefined) ? '' : (item.discount ?? 0)}
            min={0}
            onChange={(e) => onSetDiscount(item.menuId, Number(e.target.value) || 0, item.variantId)}
            onFocus={() => onSetFocusedDiscountId(itemKey)}
            onBlur={() => onSetFocusedDiscountId(null)}
          />
          {!focusedDiscountId && (item.discount === 0 || item.discount === null || item.discount === undefined) && (
            <div className="absolute inset-0 flex items-center px-2 text-xs text-muted-foreground pointer-events-none">
              Diskon (Rp)
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          className="text-xs text-destructive hover:underline active:scale-95 transition-transform"
          onClick={() => onDecrease(item.menuId, item.variantId)}
        >
          Hapus
        </button>
      </div>
    </div>
  );
});

export function MobileCart() {
  const { user, userData } = useAuth();
  const { cart, increaseQty, decreaseQty, setItemNote, setItemDiscount, clearCart, checkout } = useCart();
  const { menu } = useMenu(userData?.cafe_id);
  const { settings } = useCafeSettings(userData?.cafe_id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [payment, setPayment] = useState<any>('Tunai');
  const [orderNote, setOrderNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [focusedDiscountId, setFocusedDiscountId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const { promotions } = usePromotions(userData?.cafe_id)
  const [appliedPromoName, setAppliedPromoName] = useState<string | null>(null);
  const manualDiscountSet = useRef(false);
  const router = useRouter();

  const loadingMessages = useMemo(() => [
    "Memproses...",
    "Menyimpan...",
    "Finalisasi...",
  ], [])
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!isProcessing) return
    setMessageIndex(0)
    const interval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, loadingMessages.length - 1))
    }, 2800)
    return () => clearInterval(interval)
  }, [isProcessing, loadingMessages])

  // Reset promo/discount state when cart is cleared or emptied
  useEffect(() => {
    if (cart.length === 0) {
      setDiscountType('percent')
      setDiscountValue(0)
      setAppliedPromoName(null)
      manualDiscountSet.current = false
    }
  }, [cart.length])

  const { subtotal, discountAmount, discountedSubtotal, tax, service, total, totalItems } = useMemo(() => {
    const sub = cart.reduce((sum, c) => sum + Math.max(0, c.price * c.qty - (c.discount ?? 0)), 0);
    const discAmt = discountType === 'percent' ? Math.round(sub * discountValue / 100) : discountValue;
    const discSub = Math.max(0, sub - discAmt);
    const tx = Math.round(((settings?.taxPercent || 0) / 100) * discSub);
    const sv = Math.round(((settings?.servicePercent || 0) / 100) * discSub);
    return {
      subtotal: sub,
      discountAmount: discAmt,
      discountedSubtotal: discSub,
      tax: tx,
      service: sv,
      total: discSub + tx + sv,
      totalItems: cart.reduce((sum, item) => sum + item.qty, 0)
    };
  }, [cart, settings?.taxPercent, settings?.servicePercent, discountType, discountValue]);

  useEffect(() => {
    if (!cart.length || !promotions.length) return
    if (manualDiscountSet.current) return

    const cartItems = cart.map((item: any) => {
      const menuItem = menu.find((m: any) => m.id === item.menuId)
      return {
        menuId: item.menuId,
        name: item.name,
        categoryId: menuItem?.categoryId,
        price: item.price,
        qty: item.qty,
        discount: item.discount || 0,
      }
    })

    const match = findBestPromo(cartItems, subtotal, promotions)
    if (match.promo && match.discountAmount > 0) {
      setAppliedPromoName(match.promo.name)
      if (match.promo.type === 'percent') {
        setDiscountType('percent')
      } else {
        setDiscountType('flat')
      }
      setDiscountValue(match.promo.value)
    } else {
      setAppliedPromoName(null)
      setDiscountValue(0)
      setDiscountType('percent')
    }
  }, [cart, subtotal, promotions, menu])

  const handleDiscountChange = (type: 'percent' | 'flat', value: number) => {
    manualDiscountSet.current = value > 0
    setDiscountType(type)
    setDiscountValue(value)
    if (value === 0) {
      setAppliedPromoName(null)
    }
  }

  // Close when cart becomes empty
  useEffect(() => {
    if (cart.length === 0 && isExpanded && !showReceiptModal && !isProcessing) {
      setIsExpanded(false);
    }
  }, [cart.length, isExpanded, showReceiptModal, isProcessing]);

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
    <div className="w-full fixed bottom-20 left-0 right-0 z-[50] px-4">
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
            className="fixed inset-x-0 bottom-0 bg-background border-t rounded-t-lg shadow-xl z-[55] flex flex-col max-h-[90vh]"
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
              {/* Empty state — only when truly empty and not processing */}
              {cart.length === 0 && !isProcessing && (
                <div className="text-center py-4 text-muted-foreground">Belum ada item.</div>
              )}
              {/* Cart items — rendered during processing too, with blur */}
              {(cart.length > 0 || isProcessing) && (
                <div className="relative">
                  {/* Cart items — blurred when processing */}
                  <div className={isProcessing ? 'blur-[2px] pointer-events-none select-none' : ''}>
                    {cart.map((c) => (
                      <MemoizedCartItem
                        key={c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId}
                        item={c}
                        menu={menu}
                        onDecrease={decreaseQty}
                        onIncrease={increaseQty}
                        onSetNote={setItemNote}
                        onSetDiscount={setItemDiscount}
                        focusedDiscountId={focusedDiscountId}
                        onSetFocusedDiscountId={setFocusedDiscountId}
                      />
                    ))}
                  </div>
                  {/* Loading overlay — outside blur wrapper */}
                  {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                      <Loader2 className="h-7 w-7 text-primary animate-spin mb-3" />
                      <div className="relative h-5 flex items-center justify-center mb-1">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={messageIndex}
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(4px)" }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="text-sm font-semibold text-foreground absolute"
                          >
                            {loadingMessages[messageIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.18, ease: "easeInOut" }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart summary and checkout */}
            <div className="p-3 border-t bg-card">
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                {discountAmount > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-destructive">
                      <div className="flex items-center gap-2">
                        <span>Diskon</span>
                        <select
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                          value={discountType}
                          onChange={(e) => handleDiscountChange(e.target.value as 'percent' | 'flat', discountValue)}
                        >
                          <option value="percent">%</option>
                          <option value="flat">Rp</option>
                        </select>
                        <input
                          type="number"
                          className="w-16 text-xs border rounded px-1 py-0.5 bg-background"
                          value={discountValue || ''}
                          placeholder="0"
                          min={0}
                          onChange={(e) => handleDiscountChange(discountType, Math.max(0, Number(e.target.value) || 0))}
                        />
                      </div>
                      <span>-{formatRupiah(discountAmount)}</span>
                    </div>
                    {appliedPromoName && (
                      <div className="text-xs text-emerald-600 font-medium">
                        Promo &quot;{appliedPromoName}&quot; diterapkan
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal setelah diskon</span>
                      <span>{formatRupiah(discountedSubtotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Diskon</span>
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-background opacity-60"
                        value={discountType}
                        onChange={(e) => handleDiscountChange(e.target.value as 'percent' | 'flat', discountValue)}
                      >
                        <option value="percent">%</option>
                        <option value="flat">Rp</option>
                      </select>
                      <input
                        type="number"
                        className="w-16 text-xs border rounded px-1 py-0.5 bg-background opacity-60"
                        value={discountValue || ''}
                        placeholder="0"
                        min={0}
                        onChange={(e) => handleDiscountChange(discountType, Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                    <span>{formatRupiah(0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-muted-foreground">
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
                    const tx = await checkout(payment, orderNote, user?.id, userData?.full_name, userData?.cafe_id || 1, settings, menuMap, {
                      type: discountType,
                      value: discountValue,
                      amount: discountAmount,
                      name: appliedPromoName,
                    });
                    if (tx) {
                      toast.success('Transaksi berhasil disimpan!', {
                        description: `Total: ${formatRupiah(tx.totalAmount || tx.total_amount || 0)}`
                      })
                      setReceiptTransaction(tx)
                      setShowReceiptModal(true)
                      setIsExpanded(false)
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      {receiptTransaction && (
        <ReceiptModal
          transaction={receiptTransaction}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setReceiptTransaction(null)
            setIsExpanded(false)
          }}
        />
      )}
    </div>
  );
}