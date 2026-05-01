'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface HourData {
  hour: string;
  sales: number;
  transactions: number;
  customers: number;
  efficiency: number;
}

interface PeakHoursAnalysisProps {
  data: HourData[];
}

export function PeakHoursAnalysis({ data }: PeakHoursAnalysisProps) {
  // Calculate peak hours (top 3 hours by sales)
  const peakHours = [...data]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 3);

  // Calculate quiet hours (bottom 3 hours by sales)
  const quietHours = [...data]
    .sort((a, b) => a.sales - b.sales)
    .slice(0, 3);

  // Calculate metrics
  const totalSales = data.reduce((sum, curr) => sum + curr.sales, 0);
  const totalTransactions = data.reduce((sum, curr) => sum + curr.transactions, 0);
  const avgSalesPerHour = totalSales / data.length;
  const peakHourTotal = peakHours.reduce((sum, curr) => sum + curr.sales, 0);
  const peakPercentage = ((peakHourTotal / totalSales) * 100).toFixed(1);

  // Find efficiency patterns
  const highEfficiencyHours = data.filter(hour => hour.efficiency > 80);
  const mostEfficientHour = data.reduce((max, curr) => 
    curr.efficiency > max.efficiency ? curr : max, data[0] || { efficiency: 0 }
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const hour = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            Jam {hour.hour}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Penjualan: <span className="font-medium text-foreground">
                {formatRupiah(hour.sales)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Transaksi: <span className="font-medium text-foreground">
                {hour.transactions}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Pelanggan: <span className="font-medium text-foreground">
                {hour.customers}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Efisiensi: <span className="font-medium text-foreground">
                {hour.efficiency}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground">Analisis Jam Puncak</h3>
          <p className="text-xs text-muted-foreground">Identifikasi waktu operasional optimal</p>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                yAxisId="left"
                tickFormatter={(value) => `${value/1000}k`}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'var(--chart-2)', r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Peak Hours */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Jam Puncak</h4>
            <p className="text-xs text-muted-foreground">3 jam tersibuk</p>
          </div>
          <div className="space-y-2">
            {peakHours.map((hour, index) => (
              <div key={hour.hour} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{hour.hour}</span>
                  <span className="text-xs text-muted-foreground">({hour.transactions} trans)</span>
                </div>
                <span className="text-xs font-bold text-chart-1">
                  {formatRupiah(hour.sales)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">% Total Penjualan</span>
              <span className="font-bold text-chart-1">{peakPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Jam Sepi</h4>
            <p className="text-xs text-muted-foreground">3 jam paling sepi</p>
          </div>
          <div className="space-y-2">
            {quietHours.map((hour, index) => (
              <div key={hour.hour} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{hour.hour}</span>
                  <span className="text-xs text-muted-foreground">({hour.transactions} trans)</span>
                </div>
                <span className="text-xs font-bold text-chart-3">
                  {formatRupiah(hour.sales)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Analysis */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Efisiensi Operasional</h4>
            <p className="text-xs text-muted-foreground">Analisis produktivitas</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Jam Paling Efisien</span>
              <span className="text-xs font-bold text-chart-2">{mostEfficientHour.hour}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Efisiensi Tertinggi</span>
              <span className="text-xs font-bold text-chart-2">{mostEfficientHour.efficiency}%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Jam Efisien (&gt;80%)</span>
              <span className="text-xs font-bold text-chart-2">{highEfficiencyHours.length} jam</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">Rata-rata/Jam</span>
              <span className="text-xs font-bold text-foreground">
                {formatRupiah(avgSalesPerHour)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4">Rekomendasi Operasional</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-3 bg-chart-1/5 rounded-lg">
              <h5 className="text-xs font-semibold text-chart-1 mb-2">Stafing Optimal</h5>
              <p className="text-xs text-muted-foreground">
                Tambahkan staf pada jam {peakHours.map(h => h.hour).join(', ')} untuk mengantisipasi lonjakan pelanggan.
              </p>
            </div>
            <div className="p-3 bg-chart-2/5 rounded-lg">
              <h5 className="text-xs font-semibold text-chart-2 mb-2">Promosi Jam Sepi</h5>
              <p className="text-xs text-muted-foreground">
                Jalankan promo khusus pada jam {quietHours.map(h => h.hour).join(', ')} untuk meningkatkan penjualan.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-chart-3/5 rounded-lg">
              <h5 className="text-xs font-semibold text-chart-3 mb-2">Optimasi Shift</h5>
              <p className="text-xs text-muted-foreground">
                Pertimbangkan untuk memulai shift 1 jam sebelum jam puncak dan berakhir 1 jam setelahnya.
              </p>
            </div>
            <div className="p-3 bg-chart-4/5 rounded-lg">
              <h5 className="text-xs font-semibold text-chart-4 mb-2">Analisis Trend</h5>
              <p className="text-xs text-muted-foreground">
                {Number(peakPercentage) > 50 ? 'Lebih dari 50% penjualan terjadi pada jam puncak, pertimbangkan ekspansi.' : 'Distribusi penjualan merata, pertahankan strategi saat ini.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
