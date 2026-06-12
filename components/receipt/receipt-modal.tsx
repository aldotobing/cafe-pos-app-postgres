"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import { useAuth } from "@/lib/auth-context"
import type { Transaction } from "@/types"
import { X, CheckCircle2, Printer } from "lucide-react"
import { ReceiptContent } from "./receipt-content"

interface ReceiptModalProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 24, stiffness: 260, mass: 0.9 },
  },
  exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.18 } },
}

export function ReceiptModal({ transaction, isOpen, onClose }: ReceiptModalProps) {
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const { settings } = useCafeSettings(cafeId)
  const router = useRouter()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen])

  const handleViewFullReceipt = () => {
    if (!transaction) return
    onClose()
    router.push(`/receipt/${transaction.id}`)
  }

  const creatorName = transaction?.cashier_name
    ? transaction.cashier_name.split(" ")[0]
    : "Kasir"

  const tx = transaction

  return (
    <AnimatePresence>
      {isOpen && tx && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-border/60 flex flex-col"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border/40 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/20 dark:to-transparent">
              <div className="flex items-center gap-2.5">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 14, stiffness: 220, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <div>
                  <h2 className="font-semibold text-base text-foreground leading-tight">
                    Transaksi Berhasil
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {tx.transactionNumber || tx.transaction_number || tx.id?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-1 hover:bg-muted/70 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-muted/15">
              <div className="receipt-wrapper">
                <ReceiptContent tx={tx} settings={settings} creatorName={creatorName} />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 flex gap-2.5 px-5 py-4 border-t border-border/40 bg-muted/10">
              <button
                onClick={handleViewFullReceipt}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:brightness-110 active:scale-[0.97] transition-all shadow-sm"
              >
                <Printer className="h-4 w-4" />
                Cetak Struk
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-background text-foreground border border-border/60 px-4 py-2.5 text-sm font-medium hover:bg-accent active:scale-[0.97] transition-all shadow-sm"
              >
                Selesai
              </button>
            </div>
          </motion.div>

        <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-wrapper, .receipt-wrapper * {
            visibility: visible;
          }
          .receipt-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .receipt {
            width: 48mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            color: #000000 !important;
            font-weight: 700 !important;
            -webkit-font-smoothing: none !important;
            text-rendering: optimizeSpeed !important;
            -webkit-print-color-adjust: exact !important;
          }
          .receipt * {
            text-shadow: none !important;
            -webkit-text-stroke: 0.2px black;
          }
        }
      `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
