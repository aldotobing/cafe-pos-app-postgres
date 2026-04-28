"use client"

import { useEffect, useState } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import useSWR from "swr"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { swrConfig } from "@/lib/swr-config"
import type { Transaction, TransactionItem } from "@/types"
import { X, Printer, ArrowUpRight, Calendar, User, CreditCard, Hash } from "lucide-react"

interface TransactionDetailModalProps {
  transactionId: string
  isOpen: boolean
  onClose: () => void
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-card rounded-t-2xl md:rounded-2xl shadow-2xl max-w-lg w-full h-[85vh] md:h-auto md:max-h-[90vh] overflow-auto border-0 md:border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30 rounded-t-2xl sticky top-0 z-10">
          <h2 className="font-semibold text-base text-foreground">Detail Transaksi</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-32 bg-muted rounded mb-2 animate-pulse"></div>
              <div className="text-sm text-muted-foreground">Memuat detail...</div>
            </div>
          ) : !tx ? (
            <div className="text-center py-12 text-muted-foreground">
              Transaksi tidak ditemukan
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No:</span>
                  <span className="font-medium">{tx.transactionNumber || tx.id?.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tgl:</span>
                  <span className="font-medium">{formatTanggal(tx.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Kasir:</span>
                  <span className="font-medium">{creatorName || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bayar:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                    {tx.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 border-b">
                  <h3 className="font-medium text-sm">Item Pesanan</h3>
                </div>
                <div className="p-4 space-y-3">
                  {tx.items.map((item: TransactionItem, index: number) => {
                    const itemName = item.name || item.menu_name || item.menuName || "Item"
                    const itemQty = item.qty || item.quantity || 1
                    const lineTotal = item.lineTotal !== undefined ? item.lineTotal : (item.price * itemQty)
                    
                    return (
                      <div key={`${item.id || 'item'}-${index}`} className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{itemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {itemQty} x {formatRupiah(item.price)}
                          </div>
                          {item.discount && Number(item.discount) > 0 && (
                            <div className="text-xs text-red-500">
                              Diskon: -{formatRupiah(item.discount || 0)}
                            </div>
                          )}
                          {item.note && (
                            <div className="text-xs text-muted-foreground italic mt-0.5">
                              Note: {item.note}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-semibold">
                          {formatRupiah(lineTotal)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Order Note */}
              {tx.orderNote && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Catatan:</div>
                  <div className="text-sm">{tx.orderNote}</div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRupiah(tx.subtotal)}</span>
                </div>
                {(settings?.taxPercent || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PPN ({settings?.taxPercent}%)</span>
                    <span>{formatRupiah(tx.taxAmount || 0)}</span>
                  </div>
                )}
                {(settings?.servicePercent || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service ({settings?.servicePercent}%)</span>
                    <span>{formatRupiah(tx.serviceCharge || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatRupiah(tx.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-4 border-t bg-muted/30 md:rounded-b-2xl sticky bottom-0">
          <button
            onClick={handleViewReceipt}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
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
    </div>
  )
}
