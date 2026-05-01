'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { } from 'lucide-react';

interface HourlySalesData {
  hour: string;
  sales: number;
  transactions: number;
  avgValue: number;
}

interface HourlySalesChartProps {
  data: HourlySalesData[];
}

export function HourlySalesChart({ data }: HourlySalesChartProps) {
  // Find peak hour
  const peakHour = data.reduce((max, curr) => 
    curr.sales > max.sales ? curr : max, data[0] || { hour: '00:00', sales: 0 }
  );

  // Calculate total sales
  const totalSales = data.reduce((sum, curr) => sum + curr.sales, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            Jam {data.hour}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Penjualan: <span className="font-medium text-foreground">
                {new Intl.NumberFormat('id-ID').format(data.sales)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Transaksi: <span className="font-medium text-foreground">
                {data.transactions}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Rata-rata: <span className="font-medium text-foreground">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.avgValue)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Analisis Jam Sibuk</h3>
          <p className="text-xs text-muted-foreground">Pola penjualan per jam</p>
        </div>
        
        {/* Peak Hour Badge */}
        <div className="bg-chart-1/10 text-chart-1 px-2 py-1 rounded-md font-medium text-xs">
          Puncak: {peakHour.hour}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
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
              tickFormatter={(value) => `${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Penjualan</p>
          <p className="text-sm font-bold text-foreground">
            {new Intl.NumberFormat('id-ID').format(totalSales)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Jam Puncak</p>
          <p className="text-sm font-bold text-chart-1">{peakHour.hour}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Rata-rata/Jam</p>
          <p className="text-sm font-bold text-foreground">
            {new Intl.NumberFormat('id-ID').format(Math.round(totalSales / data.length))}
          </p>
        </div>
      </div>
    </div>
  );
}
