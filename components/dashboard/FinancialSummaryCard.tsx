'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatRupiah } from '@/lib/format';
import { apiFetcher } from '@/lib/swr-config';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  targetRevenue: number;
  targetAchievement: number;
}

export function FinancialSummaryCard() {
  const { userData } = useAuth();
  const cafeId = userData?.cafe_id;
  
  const [startDate] = useState(startOfMonth(new Date()));
  const [endDate] = useState(endOfMonth(new Date()));
  
  const apiUrl = cafeId ? `/api/finance/summary?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}` : null;
  
  const { data: response, isLoading, error } = useSWR<{ data: FinancialSummary }>(
    apiUrl,
    apiFetcher,
    { revalidateOnFocus: false }
  );
  
  const summaryData = response?.data;
  
  const revenue = summaryData?.totalRevenue || 0;
  const expenses = summaryData?.totalExpenses || 0;
  const netProfit = summaryData?.netProfit || 0;
  const targetAchievement = summaryData?.targetAchievement || 0;
  
  const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
  
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden rounded-lg border border-border shadow-subtle h-full flex flex-col">
        <CardHeader className="pb-3 px-4">
          <div className="h-5 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="flex-1 px-4">
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-6 bg-muted rounded"></div>
              <div className="h-6 bg-muted rounded"></div>
            </div>
            <div className="h-px bg-border"></div>
            <div className="h-7 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="relative overflow-hidden rounded-lg border border-border shadow-subtle h-full flex flex-col">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-foreground">Ringkasan Keuangan</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 px-4">
          <p className="text-sm text-destructive">Gagal memuat data</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Link href="/expenses" className="block h-full">
      <Card className="relative overflow-hidden rounded-lg border border-border shadow-subtle hover:shadow-md transition-all duration-300 group bg-card h-full flex flex-col">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-foreground text-base font-semibold">Ringkasan Keuangan</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM yyyy')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10 flex-1 px-4">
          {/* Revenue & Expenses Row - More Compact */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Pendapatan</p>
              <p className="font-bold text-foreground leading-tight text-lg">
                {formatRupiah(revenue)}
              </p>
              {targetAchievement > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{targetAchievement}%</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Pengeluaran</p>
              <p className="font-bold text-foreground leading-tight text-lg">
                {formatRupiah(expenses)}
              </p>
            </div>
          </div>
          
          {/* Subtle Divider */}
          <div className="h-px bg-border/60 my-3" />
          
          {/* Net Profit with trend - More prominent */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Laba Bersih</p>
              <p className={cn(
                "font-bold leading-tight text-xl",
                netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold",
              netProfit >= 0 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            )}>
              {netProfit >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(profitMargin)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
