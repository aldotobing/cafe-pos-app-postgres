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
  targetGap: number;
}

export function FinancialSummaryCard() {
  const { userData } = useAuth();
  const cafeId = userData?.cafe_id;

  const [startDate] = useState(startOfMonth(new Date()));
  const [endDate] = useState(endOfMonth(new Date()));

  const apiUrl = cafeId ? `/api/finance/summary?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}` : null;

  const { data: response, isLoading } = useSWR<{ data: FinancialSummary }>(apiUrl, apiFetcher, { revalidateOnFocus: false });

  const summaryData = response?.data;

  const revenue = summaryData?.totalRevenue || 0;
  const expenses = summaryData?.totalExpenses || 0;
  const netProfit = summaryData?.netProfit || 0;
  const targetRevenue = summaryData?.targetRevenue || 0;
  const targetAchievement = summaryData?.targetAchievement || 0;
  const targetGap = summaryData?.targetGap || 0;

  const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="rounded-lg border shadow-subtle h-full flex flex-col">
        <CardHeader className="pb-3 px-4">
          <div className="h-5 bg-muted rounded w-1/2 mb-2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent className="flex-1 px-4">
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-6 bg-muted rounded" />
              <div className="h-6 bg-muted rounded" />
            </div>
            <div className="h-px bg-border" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-5 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href="/expenses" className="block h-full">
      <Card className="rounded-lg border shadow-subtle hover:shadow-md transition-all duration-300 group bg-card h-full flex flex-col">
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-base font-semibold">Ringkasan Keuangan</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM yyyy')}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 px-4 space-y-3">
          {/* Revenue & Expenses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pendapatan</p>
              <p className="font-bold text-lg tabular-nums">{formatRupiah(revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pengeluaran</p>
              <p className="font-bold text-lg tabular-nums">{formatRupiah(expenses)}</p>
            </div>
          </div>

          {/* Target */}
          {targetRevenue > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Target</span>
                <span className="text-xs font-medium tabular-nums">{formatRupiah(targetRevenue)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    targetAchievement >= 100 ? 'bg-emerald-500' : targetAchievement >= 70 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(targetAchievement, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {targetAchievement >= 100
                  ? 'Target tercapai!'
                  : `Kurang ${formatRupiah(targetGap)}`}
              </p>
            </div>
          )}

          <div className="h-px bg-border/60" />

          {/* Net Profit */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Laba Bersih</p>
              <p className={cn("font-bold text-lg tabular-nums", netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold",
              netProfit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            )}>
              {netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(profitMargin)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
