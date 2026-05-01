'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatRupiah } from '@/lib/format';
import { CashFlowItem } from '@/types/finance';

interface CashFlowChartProps {
  data: CashFlowItem[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const cashIn = payload.find((p: any) => p.dataKey === 'cashIn')?.value || 0;
      const cashOut = payload.find((p: any) => p.dataKey === 'cashOut')?.value || 0;
      const netFlow = cashIn - cashOut;
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            {payload[0].payload.date}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-emerald-600">Kas Masuk</span>
              <span className="text-xs font-medium text-emerald-700">
                {formatRupiah(cashIn)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-red-600">Kas Keluar</span>
              <span className="text-xs font-medium text-red-700">
                {formatRupiah(cashOut)}
              </span>
            </div>
            <div className="border-t border-border pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className={`text-xs font-medium ${netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  Net Flow
                </span>
                <span className={`text-xs font-bold ${netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {netFlow >= 0 ? '+' : ''}{formatRupiah(netFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate totals
  const totalIn = data.reduce((sum, item) => sum + item.cashIn, 0);
  const totalOut = data.reduce((sum, item) => sum + item.cashOut, 0);
  const netTotal = totalIn - totalOut;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Arus Kas</h3>
          <p className="text-xs text-muted-foreground">
            Pemasukan vs Pengeluaran harian
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${netTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netTotal >= 0 ? '+' : ''}{formatRupiah(netTotal)}
          </p>
          <p className="text-xs text-muted-foreground">Net Total</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}`;
              }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(value) => `${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="cashIn" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cashOut" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-emerald-600 mb-1">Total Masuk</p>
          <p className="text-sm font-bold text-emerald-700">{formatRupiah(totalIn)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-600 mb-1">Total Keluar</p>
          <p className="text-sm font-bold text-red-700">{formatRupiah(totalOut)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs mb-1 ${netTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Net Flow
          </p>
          <p className={`text-sm font-bold ${netTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netTotal >= 0 ? '+' : ''}{formatRupiah(netTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
