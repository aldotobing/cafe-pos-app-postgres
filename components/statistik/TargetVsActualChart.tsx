'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatRupiah } from '@/lib/format';
import { TargetComparison } from '@/types/finance';

interface TargetVsActualChartProps {
  data: TargetComparison[];
}

export function TargetVsActualChart({ data }: TargetVsActualChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            {item.date}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-chart-1">Target</span>
              <span className="text-xs font-medium text-foreground">
                {formatRupiah(item.target)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-chart-2">Aktual</span>
              <span className="text-xs font-medium text-foreground">
                {formatRupiah(item.actual)}
              </span>
            </div>
            <div className="border-t border-border pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className={`text-xs font-medium ${
                  item.achievement >= 100 ? 'text-emerald-600' : 
                  item.achievement >= 80 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  Pencapaian: {item.achievement}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate averages
  const avgAchievement = data.length > 0 
    ? Math.round(data.reduce((sum, item) => sum + item.achievement, 0) / data.length)
    : 0;

  const totalTarget = data.reduce((sum, item) => sum + item.target, 0);
  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const overallAchievement = totalTarget > 0 
    ? Math.round((totalActual / totalTarget) * 100)
    : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Target vs Aktual</h3>
          <p className="text-xs text-muted-foreground">
            Perbandingan target dengan pendapatan aktual
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            overallAchievement >= 100 ? 'text-emerald-700' : 
            overallAchievement >= 80 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {overallAchievement}%
          </div>
          <p className="text-xs text-muted-foreground">Pencapaian Rata-rata</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
            <ReferenceLine 
              y={avgAchievement} 
              stroke="var(--chart-3)" 
              strokeDasharray="3 3" 
              label={{ value: `Avg: ${avgAchievement}%`, fill: 'var(--muted-foreground)', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="target"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#targetGradient)"
              name="Target"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="url(#actualGradient)"
              name="Aktual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="text-xs text-muted-foreground">Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="text-xs text-muted-foreground">Aktual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: 'var(--chart-3)', borderStyle: 'dashed' }} />
          <span className="text-xs text-muted-foreground">Rata-rata</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Target</p>
          <p className="text-sm font-bold text-foreground">{formatRupiah(totalTarget)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Aktual</p>
          <p className={`text-sm font-bold ${totalActual >= totalTarget ? 'text-emerald-700' : 'text-amber-600'}`}>
            {formatRupiah(totalActual)}
          </p>
        </div>
      </div>
    </div>
  );
}
