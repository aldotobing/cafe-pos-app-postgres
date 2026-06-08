"use client"

import { useRouter } from "next/navigation"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { useAuth } from "@/lib/auth-context"
import type { Transaction, TransactionItem } from "@/types"
import { X, ArrowUpRight, BadgePercent } from "lucide-react"

interface ReceiptModalProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
}

export function ReceiptModal({ transaction, isOpen, onClose }: ReceiptModalProps) {
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const { settings } = useCafeSettings(cafeId)

  const router = useRouter()

  const handleViewFullReceipt = () => {
    if (!transaction) return
    onClose()
    router.push(`/receipt/${transaction.id}`)
  }

  const creatorName = transaction?.cashier_name
    ? transaction.cashier_name.split(" ")[0]
    : "Kasir"

  if (!isOpen || !transaction) return null

  const tx = transaction
  const items: TransactionItem[] = tx.items || (tx as any).transaction_items || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30 rounded-t-2xl">
          <h2 className="font-semibold text-base text-foreground">Struk Transaksi</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 bg-muted/20">
          <div className="receipt-wrapper">
            <div className="receipt" style={{ width: "48mm", margin: "0 auto", padding: "2mm", background: "white", color: "black", fontSize: "10px", lineHeight: "1.3", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              {/* Header: Logo + Cafe info */}
              <div className="text-center mb-0.5">
                {settings?.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt={settings.name}
                    className="mx-auto mb-1 max-h-6 object-contain"
                  />
                )}
                <div className="font-bold text-[11px]">{settings?.name}</div>
                {settings?.address && (
                  <div className="text-[9px] leading-tight">{settings.address}</div>
                )}
                {settings?.phone && (
                  <div className="text-[9px]">Telp: {settings.phone}</div>
                )}
              </div>

              {/* Separator */}
              <div className="border-b border-dashed border-gray-400 my-1"></div>

              {/* Transaction meta */}
              <div className="text-[9px] mb-1 space-y-0.5">
                <div className="flex justify-between gap-1">
                  <span className="shrink-0">No</span>
                  <span className="truncate">{tx.transactionNumber || tx.transaction_number || tx.id?.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="shrink-0">Tgl</span>
                  <span className="truncate">{formatTanggal(tx.createdAt || tx.created_at || new Date().toISOString())}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="shrink-0">Kasir</span>
                  <span className="truncate">{creatorName}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="shrink-0">Bayar</span>
                  <span className="truncate">{tx.paymentMethod || tx.payment_method || "Tunai"}</span>
                </div>
              </div>

              {/* Separator */}
              <div className="border-b border-dashed border-gray-400 my-1"></div>

              {/* Items */}
              <div className="text-[8px]">
                {items.map((item: TransactionItem, index: number) => {
                  const itemName = item.name || item.menu_name || item.menuName || "Item"
                  const itemQty = item.qty || item.quantity || 1
                  const lineTotal = item.lineTotal !== undefined ? item.lineTotal : ((item.price || 0) * itemQty)

                  return (
                  <div key={`${item.id || 'item'}-${index}`} className="mb-1.5">
                    <div className="font-semibold truncate">{itemName}</div>
                    <table className="w-full mt-0.5 table-fixed">
                      <colgroup>
                        <col style={{ width: "35%" }} />
                        <col style={{ width: "65%" }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="overflow-hidden">{itemQty}x @ {formatRupiah(item.price)}</td>
                          <td className="text-right font-medium text-[8px] whitespace-nowrap overflow-hidden">{formatRupiah(lineTotal)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {item.discount && Number(item.discount) > 0 && (
                      <div className="text-red-600 text-[8px]">
                        Diskon: -{formatRupiah(item.discount || 0)}
                      </div>
                    )}

                    {item.note &&
                      item.note !== "0" &&
                      item.note.trim() !== "" &&
                      isNaN(Number(item.note)) && (
                        <div className="italic text-gray-600 text-[8px] mt-0.5">
                          Catatan: {item.note}
                        </div>
                      )}
                  </div>
                  );
                })}
              </div>

              {/* Separator */}
              <div className="border-b border-dashed border-gray-400 my-1"></div>

              {/* Totals */}
              <div className="text-[8px] space-y-0.5 mb-1.5">
                <div style={{ display: "flex" }}>
                  <span style={{ width: "18mm", flexShrink: 0 }}>Subtotal</span>
                  <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(tx.subtotal)}</span>
                </div>
                {(tx.discountType || (tx as any).discount_type) !== 'none' && (tx.discountAmount || (tx as any).discount_amount) > 0 && (
                  <div style={{ display: "flex" }}>
                    <span style={{ width: "18mm", flexShrink: 0, fontSize: "8px" }}>Diskon</span>
                    <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>-{formatRupiah(tx.discountAmount || (tx as any).discount_amount || 0)}</span>
                  </div>
                )}
                {settings && settings.taxPercent > 0 && (
                  <div style={{ display: "flex" }}>
                    <span style={{ width: "18mm", flexShrink: 0 }}>PPN {settings.taxPercent}%</span>
                    <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(tx.taxAmount || tx.tax_amount || 0)}</span>
                  </div>
                )}
                {settings && settings.servicePercent > 0 && (
                  <div style={{ display: "flex" }}>
                    <span style={{ width: "18mm", flexShrink: 0 }}>Service {settings.servicePercent}%</span>
                    <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(tx.serviceCharge || tx.service_charge || 0)}</span>
                  </div>
                )}
                <div className="border-t-2 border-double border-gray-800 pt-1 mt-1"></div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "16mm", flexShrink: 0, fontWeight: "bold", fontSize: "8px" }}>TOTAL</span>
                  <span style={{ flex: 1, textAlign: "right", fontWeight: "bold", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(tx.totalAmount || tx.total_amount || 0)}</span>
                </div>
              </div>

              {/* Order note */}
              {(tx.orderNote || tx.order_note) && (
                <div className="mt-1 p-1 text-[9px] border border-dashed border-gray-300">
                  <div className="font-semibold mb-0.5">Catatan:</div>
                  <div className="break-words">{tx.orderNote || tx.order_note}</div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-2 text-center text-[9px]">
                <div className="font-bold text-[11px]">TERIMA KASIH</div>
                <div className="mt-0.5">Senang melayani Anda. Sampai jumpa kembali!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-4 border-t bg-muted/30 rounded-b-2xl">
          <button
            onClick={handleViewFullReceipt}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition shadow-sm"
          >
            <ArrowUpRight className="h-4 w-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-background text-foreground border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>

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
    </div>
  )
}
