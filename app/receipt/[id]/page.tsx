"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCafeSettings } from "@/hooks/use-cafe-data"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { swrConfig } from "@/lib/swr-config"
import { ReceiptContent } from "@/components/receipt/receipt-content"

export default function ReceiptPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth();
  const cafeId = userData?.cafe_id;
  const { settings, isLoading: settingsLoading } = useCafeSettings(cafeId);
  
  const { data: tx, isLoading: txLoading } = useSWR(
    cafeId ? `/api/rest/transactions/${params.id}` : null,
    async (url: string) => {
      const res = await fetch(url);
      const data = await res.json();
      // Map snake_case DB fields to camelCase for frontend
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
          discountName: data.discount_name || null,
          createdAt: data.created_at || new Date().toISOString(),
          items: data.transaction_items || data.items || [],
        };
      }
      return data;
    },
    swrConfig
  );

  const [creatorName, setCreatorName] = useState<string | null>(null)
  const hasPrintedRef = useRef(false)

  // Fetch creator name from users API
  useEffect(() => {
    // If we already have the cashier name in the transaction (new flow), use it immediately
    if (tx?.cashier_name) {
      setCreatorName(tx.cashier_name.split(' ')[0]);
      return;
    }

    const cashierId = tx?.created_by;
    if (!cashierId) {
      setCreatorName('Kasir'); // Fallback so print isn't blocked
      return;
    }
    
    // Skip invalid/legacy created_by values — set a fallback immediately
    const invalidValues = ['local', 'system', 'unknown', '', 'undefined'];
    if (invalidValues.includes(cashierId)) {
      setCreatorName('Kasir');
      return;
    }

    const fetchCreatorName = async () => {
      try {
        const response = await fetch(`/api/rest/users?id=${cashierId}`);
        
        if (response.ok) {
          const users = await response.json();
          if (Array.isArray(users) && users.length > 0) {
            setCreatorName(users[0].full_name.split(' ')[0]);
          } else {
            // If user found but no records, it might be an orphaned ID
            setCreatorName(cashierId.slice(0, 8));
          }
        } else if (response.status === 403) {
            // Security fallback: user can't see the cashier's name, but we know it's a valid ID
            setCreatorName(cashierId.slice(0, 8));
        }
      } catch (error) {
        setCreatorName(cashierId.slice(0, 8));
      }
    };

    fetchCreatorName();
  }, [tx?.created_by, tx?.cashier_name]);

  // Only print once when transaction AND creator name are both ready
  useEffect(() => {
    if (!tx || hasPrintedRef.current) return
    if (!creatorName) return // Wait for the cashier name to be resolved first
    
    hasPrintedRef.current = true // Mark as printed so it doesn't fire again
    
    const timer = setTimeout(() => {
      window.print?.()
    }, 400)
    return () => clearTimeout(timer)
  }, [tx, creatorName])

  if (authLoading || settingsLoading || txLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="text-sm text-muted-foreground">Memuat struk...</div>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
        </div>
        <div className="font-bold text-lg mb-2">Struk tidak ditemukan</div>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Transaksi dengan ID <code className="bg-muted px-1 rounded">{params.id}</code> tidak ditemukan atau Anda tidak memiliki akses.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:brightness-110 transition-all"
            onClick={() => router.push("/transactions")}
          >
            Cek Riwayat Transaksi
          </button>
          <button
            className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all"
            onClick={() => router.push("/pos")}
          >
            Kembali ke POS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="receipt-container">
      <ReceiptContent tx={tx} settings={settings} creatorName={creatorName} />

      {/* Action buttons - outside receipt, hidden when printing */}
      <div className="w-[280px] mx-auto mt-6 flex gap-2 print-hidden">
        <button
          className="flex-1 rounded-md bg-[#D4AF37] text-[#181815] px-3 py-2.5 text-sm font-semibold hover:brightness-110"
          onClick={() => {
            window.print();
            // Redirect to POS after print dialog
            setTimeout(() => {
              router.push("/pos");
            }, 1000);
          }}
        >
          Cetak Struk
        </button>
        <button
          className="flex-1 rounded-md bg-muted text-foreground border border-border px-3 py-2.5 text-sm hover:bg-muted/80"
          onClick={() => router.push("/pos")}
        >
          Kembali ke POS
        </button>
      </div>

      <style jsx global>{`
        @page {
          size: 58mm auto;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print-hidden {
            display: none !important;
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
