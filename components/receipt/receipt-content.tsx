"use client"

import { formatRupiah, formatTanggal } from "@/lib/format"
import { OptimizedImage } from "@/components/ui/optimized-image"
import type { TransactionItem } from "@/types"

interface ReceiptContentProps {
  tx: any
  settings: any
  creatorName?: string | null
}

export function ReceiptContent({ tx, settings, creatorName }: ReceiptContentProps) {
  const items: TransactionItem[] = tx.items || tx.transaction_items || []
  const txNumber = tx.transactionNumber || tx.transaction_number || tx.id?.slice(0, 10)
  const txDate = tx.createdAt || tx.created_at || new Date().toISOString()
  const txPayment = tx.paymentMethod || tx.payment_method || "Tunai"
  const txSubtotal = tx.subtotal ?? 0
  const txDiscountType = tx.discountType || tx.discount_type || 'none'
  const txDiscountAmount = tx.discountAmount || tx.discount_amount || 0
  const txDiscountName = tx.discountName || tx.discount_name || null
  const txTaxAmount = tx.taxAmount || tx.tax_amount || 0
  const txServiceCharge = tx.serviceCharge || tx.service_charge || 0
  const txTotal = tx.totalAmount || tx.total_amount || 0
  const txNote = tx.orderNote || tx.order_note || ''
  const isVoided = tx.status === 'voided'

  return (
    <div className="receipt" style={{ width: "48mm", margin: "0 auto", padding: "2mm", background: "white", color: "black", fontSize: "10px", lineHeight: "1.3", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      {/* Header: Logo + Cafe info */}
      <div className="text-center mb-0.5">
        {settings?.logoUrl && (
          <div className="flex justify-center mb-1">
            <OptimizedImage
              src={settings.logoUrl}
              alt={settings.name || "Logo"}
              width={64}
              height={24}
              objectFit="contain"
            />
          </div>
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
          <span className="truncate">{txNumber}</span>
        </div>
        <div className="flex justify-between gap-1">
          <span className="shrink-0">Tgl</span>
          <span className="truncate">{formatTanggal(txDate)}</span>
        </div>
        {creatorName && (
          <div className="flex justify-between gap-1">
            <span className="shrink-0">Kasir</span>
            <span className="truncate">{creatorName}</span>
          </div>
        )}
        <div className="flex justify-between gap-1">
          <span className="shrink-0">Bayar</span>
          <span className="truncate">{txPayment}</span>
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-dashed border-gray-400 my-1"></div>

      {/* Items */}
      <div className="text-[8px]">
        {items.map((item: TransactionItem, index: number) => {
          const itemName = item.name || item.menu_name || item.menuName || "Item"
          const rawQty = item.qty ?? item.quantity
          const itemQty = rawQty != null && String(rawQty) !== "" && !isNaN(Number(rawQty)) ? Number(rawQty) : 1
          const displayQty = itemQty === 0 ? "" : itemQty
          const lineTotal = item.lineTotal !== undefined ? item.lineTotal : ((item.price || 0) * itemQty)
          const discountNum = Number(item.discount)
          const hasItemDiscount = !isNaN(discountNum) && discountNum > 0
          const noteStr = item.note != null ? String(item.note).trim() : ""
          const hasItemNote = noteStr !== "" && noteStr !== "0" && isNaN(Number(noteStr))

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
                    <td className="overflow-hidden">{displayQty}{displayQty !== "" ? "x @ " : ""}{formatRupiah(item.price)}</td>
                    <td className="text-right font-medium text-[8px] whitespace-nowrap overflow-hidden">{formatRupiah(lineTotal)}</td>
                  </tr>
                </tbody>
              </table>

              {hasItemDiscount && (
                <div className="text-red-600 text-[8px]">
                  Diskon: -{formatRupiah(discountNum)}
                </div>
              )}

              {hasItemNote && (
                <div className="italic text-gray-600 text-[8px] mt-0.5">
                  Catatan: {noteStr}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Separator */}
      <div className="border-b border-dashed border-gray-400 my-1"></div>

      {/* Totals */}
      <div className="text-[8px] space-y-0.5 mb-1.5">
        <div style={{ display: "flex" }}>
          <span style={{ width: "18mm", flexShrink: 0 }}>Subtotal</span>
          <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(txSubtotal)}</span>
        </div>
        {txDiscountType !== 'none' && txDiscountAmount > 0 && (
          <div style={{ display: "flex" }}>
            <span style={{ width: "18mm", flexShrink: 0, fontSize: "8px" }}>% Diskon{txDiscountName ? ` (${txDiscountName})` : ''}</span>
            <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>-{formatRupiah(txDiscountAmount)}</span>
          </div>
        )}
        {settings && settings.taxPercent > 0 && (
          <div style={{ display: "flex" }}>
            <span style={{ width: "18mm", flexShrink: 0 }}>PPN {settings.taxPercent}%</span>
            <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(txTaxAmount)}</span>
          </div>
        )}
        {settings && settings.servicePercent > 0 && (
          <div style={{ display: "flex" }}>
            <span style={{ width: "18mm", flexShrink: 0 }}>Service {settings.servicePercent}%</span>
            <span style={{ flex: 1, textAlign: "right", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(txServiceCharge)}</span>
          </div>
        )}
        <div className="border-t-2 border-double border-gray-800 pt-1 mt-1"></div>
        <div style={{ display: "flex" }}>
          <span style={{ width: "16mm", flexShrink: 0, fontWeight: "bold", fontSize: "8px" }}>TOTAL</span>
          <span style={{ flex: 1, textAlign: "right", fontWeight: "bold", fontSize: "8px", whiteSpace: "nowrap" }}>{formatRupiah(txTotal)}</span>
        </div>
      </div>

      {/* Order note */}
      {txNote && (
        <div className="mt-1 p-1 text-[9px] border border-dashed border-gray-300">
          <div className="font-semibold mb-0.5">Catatan:</div>
          <div className="break-words">{txNote}</div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 text-center text-[9px]">
        <div className="font-bold text-[11px]">TERIMA KASIH</div>
        <div className="mt-0.5">Senang melayani Anda. Sampai jumpa kembali!</div>
      </div>
    </div>
  )
}
