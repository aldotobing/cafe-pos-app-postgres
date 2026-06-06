"use client"

import { useEffect, useState } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import useSWR from "swr"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { swrConfig } from "@/lib/swr-config"
import type { Transaction, TransactionItem } from "@/types"
import { X, Printer, Calendar, User, CreditCard, Hash, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TransactionDetailModalProps {
  transactionId: string
  isOpen: boolean
  onClose: () => void
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalDesktopVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 350 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
}

const modalMobileVariants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 28, stiffness: 400 } },
  exit: { opacity: 0, y: "20%", transition: { duration: 0.15 } },
}

const paymentMethodStyles: Record<string, string> = {
  Tunai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  QRIS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  Debit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  Transfer: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
}

export function TransactionDetailModal({ transactionId, isOpen, onClose }: TransactionDetailModalProps) {
  const { userData } = useAuth()
  const router = useRouter()
  const cafeId = userData?.cafe_id
  const { settings } = useCafeSettings(cafeId)

  const { data: tx, isLoading } = useSWR(
    isOpen && cafeId ? `/api/rest/transactions/${transactionId}` : null,
    async (url: string) => {
      const res = await fetch(url)
      const data = await res.json()
      if (data) {
        return {
          ...data,
          transactionNumber: data.transaction_number || data.id?.slice(0, 10),
          taxAmount: data.tax_amount || 0,
          serviceCharge: data.service_charge || 0,
          totalAmount: data.total_amount || 0,
          paymentMethod: data.payment_method || 'Tunai',
          paymentAmount: data.payment_amount || 0,
          changeAmount: data.change_amount || 0,
          orderNote: data.order_note || '',
          createdAt: data.created_at || new Date().toISOString(),
          items: data.transaction_items || data.items || [],
        }
      }
      return data
    },
    swrConfig
  )

  const [creatorName, setCreatorName] = useState<string | null>(null)

  useEffect(() => {
    if (tx?.cashier_name) {
      setCreatorName(tx.cashier_name.split(' ')[0])
      return
    }

    const cashierId = tx?.created_by
    if (!cashierId) {
      setCreatorName('Kasir')
      return
    }

    const invalidValues = ['local', 'system', 'unknown', '', 'undefined']
    if (invalidValues.includes(cashierId)) {
      setCreatorName('Kasir')
      return
    }

    const fetchCreatorName = async () => {
      try {
        const response = await fetch(`/api/rest/users?id=${cashierId}`)
        if (response.ok) {
          const users = await response.json()
          if (Array.isArray(users) && users.length > 0) {
            setCreatorName(users[0].full_name.split(' ')[0])
          } else {
            setCreatorName(cashierId.slice(0, 8))
          }
        } else if (response.status === 403) {
          setCreatorName(cashierId.slice(0, 8))
        }
      } catch (error) {
        setCreatorName(cashierId.slice(0, 8))
      }
    }

    fetchCreatorName()
  }, [tx?.created_by, tx?.cashier_name])

  const handleViewReceipt = () => {
    onClose()
    router.push(`/receipt/${transactionId}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* Modal - Desktop */}
          <motion.div
            className="fixed inset-0 z-50 hidden md:flex items-center justify-center p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"
              variants={modalDesktopVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalContent
                tx={tx}
                isLoading={isLoading}
                creatorName={creatorName}
                settings={settings as any}
                onClose={onClose}
                onViewReceipt={handleViewReceipt}
              />
            </motion.div>
          </motion.div>

          {/* Modal - Mobile Bottom Sheet */}
          <motion.div
            className="fixed inset-0 z-50 flex md:hidden items-end justify-center"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              className="w-full bg-card rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              variants={modalMobileVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalContent
                tx={tx}
                isLoading={isLoading}
                creatorName={creatorName}
                settings={settings as any}
                onClose={onClose}
                onViewReceipt={handleViewReceipt}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ModalContent({
  tx,
  isLoading,
  creatorName,
  settings,
  onClose,
  onViewReceipt,
}: {
  tx: any
  isLoading: boolean
  creatorName: string | null
  settings: any
  onClose: () => void
  onViewReceipt: () => void
}) {
  return (
    <>
      {/* Drag handle (mobile only) */}
      <div className="flex md:hidden justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20 shrink-0">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-bold text-lg tracking-tight">Detail Transaksi</h2>
          {tx && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="font-mono tracking-tight">{tx.transactionNumber || tx.id?.slice(0, 10)}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-background hover:text-foreground transition-all text-muted-foreground active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Memuat detail...</span>
          </div>
        ) : !tx ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="p-3 rounded-full bg-muted/30">
              <X className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <span className="text-sm text-muted-foreground">Transaksi tidak ditemukan</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Info Card */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Transaksi</div>
                  <div className="text-sm font-semibold font-mono tracking-tight truncate">
                    {tx.transactionNumber || tx.id?.slice(0, 10)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-muted/20 rounded-xl p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tanggal</div>
                    <div className="text-xs font-medium truncate">{formatTanggal(tx.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-muted/20 rounded-xl p-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Kasir</div>
                    <div className="text-xs font-medium truncate">{creatorName || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-muted/20 rounded-xl p-3 col-span-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pembayaran</div>
                      <div className="text-xs font-medium">{formatRupiah(tx.paymentAmount)}</div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                      paymentMethodStyles[tx.paymentMethod] || 'bg-muted text-muted-foreground'
                    )}>
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Item ({tx.items.length})
                </h3>
              </div>
              <div className="space-y-1">
                {tx.items.map((item: TransactionItem, index: number) => {
                  const itemName = item.name || item.menu_name || item.menuName || "Item"
                  const itemQty = item.qty || item.quantity || 1
                  const lineTotal = item.lineTotal !== undefined ? item.lineTotal : (item.price * itemQty)

                  return (
                    <div
                      key={`${item.id || 'item'}-${index}`}
                      className="flex items-start justify-between py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            {itemQty}
                          </span>
                          <div>
                            <span className="text-sm font-medium">{itemName}</span>
                            {item.variant_name && (
                              <span className="text-xs text-muted-foreground ml-1.5">· {item.variant_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 ml-7">
                          <span className="text-xs text-muted-foreground">{formatRupiah(item.price)}/item</span>
                          {item.discount && Number(item.discount) > 0 && (
                            <span className="text-[11px] text-red-500 font-medium">
                              Diskon -{formatRupiah(Number(item.discount))}
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-muted-foreground/70 italic mt-1 ml-7">
                            "{item.note}"
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums ml-3 shrink-0 group-hover:text-primary transition-colors">
                        {formatRupiah(lineTotal)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Order Note */}
            {tx.orderNote && (
              <div className="px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Catatan Pesanan</div>
                <div className="bg-muted/20 rounded-xl p-3 text-sm leading-relaxed">{tx.orderNote}</div>
              </div>
            )}

            {/* Totals */}
            <div className="px-5 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatRupiah(tx.subtotal)}</span>
                </div>
                {(settings?.taxPercent || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">PPN {settings?.taxPercent}%</span>
                    <span className="font-medium tabular-nums">{formatRupiah(tx.taxAmount || 0)}</span>
                  </div>
                )}
                {(settings?.servicePercent || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Service {settings?.servicePercent}%</span>
                    <span className="font-medium tabular-nums">{formatRupiah(tx.serviceCharge || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-lg font-bold text-primary tabular-nums">{formatRupiah(tx.totalAmount || 0)}</span>
                </div>
                {tx.paymentAmount > 0 && (
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-muted-foreground">Dibayar</span>
                    <span className="font-medium tabular-nums">{formatRupiah(tx.paymentAmount)}</span>
                  </div>
                )}
                {tx.changeAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRupiah(tx.changeAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {tx && (
        <div className="flex gap-3 px-5 py-4 border-t bg-muted/10 shrink-0">
          <button
            onClick={onViewReceipt}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.97] shadow-sm shadow-primary/20"
          >
            <Printer className="h-4 w-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-background text-foreground border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all active:scale-[0.97]"
          >
            Tutup
          </button>
        </div>
      )}
    </>
  )
}
