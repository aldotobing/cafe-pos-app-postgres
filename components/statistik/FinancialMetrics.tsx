'use client';

import { motion } from 'framer-motion';
import { formatRupiah } from '@/lib/format';
import { FinancialMetrics as FinancialMetricsType } from '@/types/finance';
import { TrendingUp, TrendingDown, Target, DollarSign, Wallet } from 'lucide-react';

interface FinancialMetricsProps {
  metrics: FinancialMetricsType;
}

export function FinancialMetrics({ metrics }: FinancialMetricsProps) {
  const {
    totalRevenue,
    targetRevenue,
    targetAchievement,
    targetGap,
    grossProfit,
    netProfit,
    netProfitMargin,
    totalExpenses,
    cashIn,
    cashOut,
    netCashFlow
  } = metrics;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-chart-1 rounded-full" />
        <h2 className="text-lg font-semibold text-foreground">Metrik Keuangan</h2>
      </div>

      {/* Revenue vs Target */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Target Omzet</p>
            <p className="text-xl font-bold text-foreground">{formatRupiah(targetRevenue)}</p>
          </div>
          {targetRevenue > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-chart-3" />
                <span className="text-xs text-muted-foreground">Bulan ini</span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pendapatan Aktual</p>
            <p className="text-xl font-bold text-foreground">{formatRupiah(totalRevenue)}</p>
          </div>
          {targetRevenue > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className={`flex items-center gap-2 ${targetAchievement >= 100 ? 'text-emerald-600' : targetAchievement >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {targetAchievement >= 100 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{targetAchievement}% dari target</span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className={`bg-card rounded-xl border p-5 ${
            targetGap >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Selisih Target</p>
            <p className={`text-xl font-bold ${targetGap >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {targetGap >= 0 ? '+' : ''}{formatRupiah(targetGap)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className={`text-xs ${targetGap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {targetGap >= 0 ? 'Melebihi target!' : 'Belum mencapai target'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Profit Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <p className="text-xl font-bold text-foreground">{formatRupiah(grossProfit)}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Revenue - COGS (HPP)
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pengeluaran Operasional</p>
            <p className="text-xl font-bold text-chart-4">{formatRupiah(totalExpenses)}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Total biaya operasional
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className={`bg-card rounded-xl border p-5 ${
            netProfit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatRupiah(netProfit)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Margin: {netProfitMargin}%
            </p>
          </div>
        </motion.div>
      </div>

      {/* Cash Flow */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.6 }}
        className="bg-card rounded-xl border border-border p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Arus Kas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Kas Masuk</p>
            </div>
            <p className="text-lg font-semibold text-emerald-700">{formatRupiah(cashIn)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Kas Keluar</p>
            </div>
            <p className="text-lg font-semibold text-red-700">{formatRupiah(cashOut)}</p>
          </div>
          
          <div className={`space-y-1 p-3 rounded-lg ${netCashFlow >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Net Cash Flow
            </p>
            <p className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
