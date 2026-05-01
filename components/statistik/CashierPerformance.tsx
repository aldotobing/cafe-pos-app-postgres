'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface CashierData {
  id: string;
  name: string;
  transactions: number;
  revenue: number;
  avgTransactionValue: number;
  avgServiceTime?: number;
}

interface CashierPerformanceProps {
  data: CashierData[];
}

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function CashierPerformance({ data }: CashierPerformanceProps) {
  // Find top performer
  const topPerformer = data.reduce((max, curr) => 
    curr.revenue > max.revenue ? curr : max, data[0] || { name: '-', revenue: 0 }
  );

  // Calculate total metrics
  const totalTransactions = data.reduce((sum, curr) => sum + curr.transactions, 0);
  const totalRevenue = data.reduce((sum, curr) => sum + curr.revenue, 0);
  const avgTransactionsPerCashier = totalTransactions / (data.length || 1);

  // Prepare pie chart data
  const pieData = data.map((cashier, index) => ({
    name: cashier.name,
    value: cashier.revenue,
    color: COLORS[index % COLORS.length]
  }));

  const BarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const cashier = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            {cashier.name}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Transaksi: <span className="font-medium text-foreground">
                {cashier.transactions}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Pendapatan: <span className="font-medium text-foreground">
                {formatRupiah(cashier.revenue)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Rata-rata: <span className="font-medium text-foreground">
                {formatRupiah(cashier.avgTransactionValue)}
              </span>
            </p>
            {cashier.avgServiceTime && (
              <p className="text-xs text-muted-foreground">
                Waktu Layanan: <span className="font-medium text-foreground">
                  {cashier.avgServiceTime} detik
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalRevenue) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-1">
            {data.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRupiah(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground">Performa Kasir</h3>
          <p className="text-xs text-muted-foreground">Analisis produktivitas per kasir</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-chart-1/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Kasir</p>
            <p className="text-sm font-bold text-foreground">{data.length}</p>
          </div>
          <div className="text-center p-3 bg-chart-2/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Pendapatan</p>
            <p className="text-sm font-bold text-foreground">{formatRupiah(totalRevenue)}</p>
          </div>
          <div className="text-center p-3 bg-chart-3/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Rata-rata Transaksi</p>
            <p className="text-sm font-bold text-foreground">{Math.round(avgTransactionsPerCashier)}</p>
          </div>
          <div className="text-center p-3 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Kasir Terbaik</p>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 truncate" title={topPerformer.name}>
              {topPerformer.name}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Transaction Count */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-3">Jumlah Transaksi per Kasir</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="transactions" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Revenue Distribution */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-3">Distribusi Pendapatan</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Performance Table */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4">Detail Performa Kasir</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Kasir</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Transaksi</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Pendapatan</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Rata-rata</th>
                {data.some(d => d.avgServiceTime) && (
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Waktu Layanan</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((cashier, index) => (
                <tr key={cashier.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {cashier.name}
                      {cashier.id === topPerformer.id && (
                        <span className="text-emerald-600 text-xs font-medium">★</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">{cashier.transactions}</td>
                  <td className="py-3 px-3 text-right font-medium text-foreground">
                    {formatRupiah(cashier.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">
                    {formatRupiah(cashier.avgTransactionValue)}
                  </td>
                  {data.some(d => d.avgServiceTime) && (
                    <td className="py-3 px-3 text-right text-foreground">
                      {cashier.avgServiceTime ? `${cashier.avgServiceTime}s` : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
