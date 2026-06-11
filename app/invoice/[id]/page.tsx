"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import useSWR from "swr"
import { formatRupiah, formatTanggal } from "../../../lib/format"
import { useAuth } from "@/lib/auth-context"
import { swrConfig } from "@/lib/swr-config"
import { ArrowLeft, Download } from "lucide-react"

import type { TransactionItem } from "../../../types"

export default function InvoicePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const cafeId = userData?.cafe_id
  const { settings, isLoading: settingsLoading } = useCafeSettings(cafeId)

  const { data: tx, isLoading: txLoading } = useSWR(
    cafeId ? `/api/rest/transactions/${params.id}` : null,
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
          discountType: data.discount_type || 'none',
          discountValue: data.discount_value || 0,
          discountAmount: data.discount_amount || 0,
          createdAt: data.created_at || new Date().toISOString(),
          items: data.transaction_items || data.items || [],
          status: data.status || 'completed',
        }
      }
      return data
    },
    swrConfig
  )

  const [creatorName, setCreatorName] = useState<string | null>(null)
  const hasPrintedRef = useRef(false)

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
      } catch {
        setCreatorName(cashierId.slice(0, 8))
      }
    }

    fetchCreatorName()
  }, [tx?.created_by, tx?.cashier_name])

  useEffect(() => {
    if (!tx || hasPrintedRef.current) return
    if (!creatorName) return

    hasPrintedRef.current = true

    const timer = setTimeout(() => {
      window.print?.()
    }, 500)
    return () => clearTimeout(timer)
  }, [tx, creatorName])

  if (authLoading || settingsLoading || txLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-[200mm] p-12 space-y-8 animate-pulse">
          <div className="flex justify-between items-end pb-8 border-b">
            <div className="space-y-3">
              <div className="h-5 w-40 bg-gray-100 rounded" />
              <div className="h-4 w-56 bg-gray-50 rounded" />
            </div>
            <div className="h-14 w-28 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-50 rounded" />
            ))}
          </div>
          <div className="h-20 w-64 bg-gray-50 rounded ml-auto" />
        </div>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-white">
        <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invoice tidak ditemukan</h2>
        <p className="text-sm text-gray-500 mb-8">
          Transaksi <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{params.id}</code> tidak tersedia.
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
            onClick={() => router.push("/transactions")}
          >
            Riwayat Transaksi
          </button>
          <button
            className="rounded-lg border px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => router.push("/pos")}
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const invoiceNumber = `INV-${tx.transactionNumber || tx.id?.slice(0, 10)}`
  const isVoided = tx.status === 'voided'
  const d = new Date(tx.createdAt)
  const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const hasDiscount = (tx.discountType || (tx as any).discount_type) !== 'none' && (tx.discountAmount || (tx as any).discount_amount) > 0
  const discountAmount = tx.discountAmount || (tx as any).discount_amount || 0
  const hasTax = settings && settings.taxPercent > 0
  const hasService = settings && settings.servicePercent > 0
  const hasNote = !!tx.orderNote

  return (
    <div className="invoice-container">
      <div className="invoice max-w-[200mm] mx-auto my-8 bg-white text-gray-900 print:shadow-none print:my-0 print:max-w-none relative">

        {/* ===== HEADER ===== */}
        <div className="px-10 pt-10 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-4 mb-4">
                {settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="" className="h-10 object-contain" />
                )}
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">{settings?.name || 'Business'}</h1>
                  <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                    {settings?.address && <p>{settings.address}</p>}
                    {settings?.phone && <p>{settings.phone}</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right pt-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">INVOICE</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">{invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* ===== DIVIDER ===== */}
        <div className="px-10"><div className="border-b-2 border-slate-200" /></div>

        {/* ===== INFO BAR ===== */}
        <div className="grid grid-cols-3 gap-6 px-10 py-6 bg-slate-50 border-b">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal</p>
            <p className="text-sm font-medium text-slate-700">{dateStr}</p>
            <p className="text-sm text-slate-500">{timeStr} WIB</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Pembayaran</p>
            <p className="text-sm font-medium text-slate-700">{tx.paymentMethod}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kasir</p>
            <p className="text-sm font-medium text-slate-700">{creatorName || '-'}</p>
          </div>
        </div>

        {/* ===== ITEMS TABLE ===== */}
        <div className="px-10 pt-8 pb-4">
          <table className="w-full">
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "46%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">#</th>
                <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Item</th>
                <th className="pb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Qty</th>
                <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Harga</th>
                <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map((item: TransactionItem, index: number) => {
                const itemName = item.name || item.menu_name || item.menuName || "Item"
                const rawQty = item.qty ?? item.quantity
                const itemQty = rawQty != null && String(rawQty) !== "" && !isNaN(Number(rawQty)) ? Number(rawQty) : 1
                const displayQty = itemQty === 0 ? "" : itemQty
                const lineTotal = item.lineTotal !== undefined ? item.lineTotal : (item.price * itemQty)
                const discountNum = Number(item.discount)
                const hasItemDiscount = !isNaN(discountNum) && discountNum > 0
                const noteStr = item.note != null ? String(item.note).trim() : ""
                const hasItemNote = noteStr !== "" && noteStr !== "0" && isNaN(Number(noteStr))
                const variantStr = item.variant_name != null ? String(item.variant_name).trim() : ""
                const itemVariant = variantStr !== "" && variantStr !== "0" ? variantStr : null

                return (
                  <tr key={`${item.id || 'item'}-${index}`} className="border-b border-slate-100">
                    <td className="py-4 text-sm text-slate-300 align-top">{index + 1}</td>
                    <td className="py-4 align-top pr-4">
                      <p className="text-sm font-medium text-slate-800">{itemName}</p>
                      {itemVariant && (
                        <span className="text-xs text-slate-400">· {itemVariant}</span>
                      )}
                      {hasItemDiscount && (
                        <span className="text-xs text-red-500 ml-2">−{formatRupiah(discountNum)}</span>
                      )}
                      {hasItemNote && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed italic">{noteStr}</p>
                      )}
                    </td>
                    <td className="py-4 text-center text-sm text-slate-600 align-top tabular-nums">{displayQty}</td>
                    <td className="py-4 text-right text-sm text-slate-600 align-top tabular-nums">{formatRupiah(item.price)}</td>
                    <td className="py-4 text-right text-sm font-semibold text-slate-800 align-top tabular-nums">{formatRupiah(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ===== TOTALS ===== */}
        <div className="px-10 pb-8">
          <div className="border-t-2 border-slate-200 pt-6 ml-auto" style={{ maxWidth: "280px" }}>
            <div className="space-y-2.5">
              <Row label="Subtotal" value={formatRupiah(tx.subtotal)} />

              {hasDiscount && (
                <Row label="Diskon" value={`−${formatRupiah(discountAmount)}`} muted />
              )}

              {hasTax && (
                <Row label={`PPN ${settings.taxPercent}%`} value={formatRupiah(tx.taxAmount || 0)} />
              )}

              {hasService && (
                <Row label={`Service ${settings.servicePercent}%`} value={formatRupiah(tx.serviceCharge || 0)} />
              )}

              <div className="pt-3 mt-2 border-t-2 border-slate-800 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{formatRupiah(tx.totalAmount || 0)}</span>
              </div>

              {tx.paymentAmount > 0 && (
                <Row label="Dibayar" value={formatRupiah(tx.paymentAmount)} />
              )}

              {tx.changeAmount > 0 && (
                <Row label="Kembalian" value={formatRupiah(tx.changeAmount)} valueClass="text-emerald-600" />
              )}
            </div>
          </div>
        </div>

        {/* ===== NOTE ===== */}
        {hasNote && (
          <div className="mx-10 mb-8 p-5 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Catatan</p>
            <p className="text-sm text-slate-600 leading-relaxed">{tx.orderNote}</p>
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <div className="px-10 py-5 border-t flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500">
              {settings?.name || ''}{settings?.address ? ` — ${settings.address}` : ''}{settings?.phone ? ` · ${settings.phone}` : ''}
            </p>
          </div>
          <div className="text-right">
            {isVoided ? (
              <div>
                <span className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">Dibatalkan</span>
                {tx.void_reason && (
                  <p className="text-[10px] text-slate-400 mt-1">{tx.void_reason}</p>
                )}
              </div>
            ) : (
              <span className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Lunas</span>
            )}
          </div>
        </div>

        {/* ===== VOID WATERMARK ===== */}
        {isVoided && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="text-[12rem] font-black text-red-100/50 rotate-[-12deg] tracking-[.5em] uppercase">
              Void
            </span>
          </div>
        )}
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <div className="max-w-sm mx-auto mt-8 flex gap-3 print-hidden pb-10">
        <button
          className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-[#0f172a] text-white px-5 py-3 text-sm font-medium hover:bg-[#1e293b] transition-colors active:scale-[0.98]"
          onClick={() => { window.print(); setTimeout(() => router.push("/pos"), 1000) }}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
        <button
          className="flex-1 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 hover:bg-slate-50 transition-colors active:scale-[0.98]"
          onClick={() => router.push("/transactions")}
        >
          <ArrowLeft className="h-4 w-4 mx-auto" />
        </button>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-hidden {
            display: none !important;
          }

          .invoice {
            margin: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, muted, valueClass }: {
  label: string
  value: string
  muted?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className={muted ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className={`font-medium tabular-nums ${muted ? 'text-slate-400' : valueClass || 'text-slate-700'}`}>{value}</span>
    </div>
  )
}
