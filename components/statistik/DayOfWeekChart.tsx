'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface DayOfWeekData {
  dayIndex: number;
  day: string;
  transactions: number;
  revenue: number;
  avgValue: number;
  isWeekend: boolean;
}

interface DayOfWeekChartProps {
  data: Array<{
    dayIndex: number;
    day: string;
    transactions: number;
    revenue: number;
  }>;
}

const DAY_LABELS: Record<number, string> = {
    0: 'Min',
    1: 'Sen',
    2: 'Sel',
    3: 'Rab',
    4: 'Kam',
    5: 'Jum',
    6: 'Sab',
};

const dayColors = {
  weekday: 'var(--chart-2)',
  weekend: 'var(--chart-1)'
};

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
    // Ensure all 7 days are present and add computed fields
    const fullData = Array.from({ length: 7 }, (_, i) => {
        const existing = data.find(d => d.dayIndex === i);
        const baseData = existing || { dayIndex: i, day: DAY_LABELS[i], transactions: 0, revenue: 0 };
        return {
            ...baseData,
            avgValue: baseData.transactions > 0 ? baseData.revenue / baseData.transactions : 0,
            isWeekend: i === 0 || i === 6
        };
    }).sort((a, b) => a.dayIndex - b.dayIndex);

    // Find best and worst performing days
    const bestDay = fullData.reduce((max, curr) => 
        curr.revenue > max.revenue ? curr : max, fullData[0] || { day: '-', revenue: 0 }
    );
    
    const worstDay = fullData.reduce((min, curr) => 
        curr.revenue < min.revenue ? curr : min, fullData[0] || { day: '-', revenue: 0 }
    );

    // Calculate weekend vs weekday performance
    const weekendDays = fullData.filter(d => d.isWeekend);
    const weekdayDays = fullData.filter(d => !d.isWeekend);
    const weekendAvg = weekendDays.reduce((sum, d) => sum + d.revenue, 0) / (weekendDays.length || 1);
    const weekdayAvg = weekdayDays.reduce((sum, d) => sum + d.revenue, 0) / (weekdayDays.length || 1);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload[0]) {
            const data = payload[0].payload;
            const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            return (
                <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">
                        {fullDayNames[data.dayIndex]}
                    </p>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            Penjualan: <span className="font-medium text-foreground">
                                {formatRupiah(data.revenue)}
                            </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Transaksi: <span className="font-medium text-foreground">
                                {data.transactions}
                            </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Rata-rata: <span className="font-medium text-foreground">
                                {formatRupiah(data.avgValue)}
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
                    <h3 className="text-sm font-semibold text-foreground">Performa Harian</h3>
                    <p className="text-xs text-muted-foreground">Analisis per hari dalam seminggu</p>
                </div>
                
                {/* Performance Indicators */}
                <div className="flex items-center gap-2 text-xs">
                    <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded-md font-medium">
                        {bestDay.day}
                    </div>
                    <div className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-1 rounded-md font-medium">
                        {worstDay.day}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fullData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis 
                            dataKey="day" 
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis 
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickFormatter={(value) => `${value/1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                            {fullData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.isWeekend ? dayColors.weekend : dayColors.weekday}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Rata-rata Weekday</span>
                        <span className="text-sm font-bold text-foreground">
                            {formatRupiah(weekdayAvg)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Rata-rata Weekend</span>
                        <span className="text-sm font-bold text-chart-1">
                            {formatRupiah(weekendAvg)}
                        </span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Hari Terbaik</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {bestDay.day}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Selisih Performa</span>
                        <span className="text-sm font-bold">
                            {weekendAvg > weekdayAvg ? '+' : ''}{new Intl.NumberFormat('id-ID', { 
                                style: 'percent', 
                                maximumFractionDigits: 1 
                            }).format((weekendAvg - weekdayAvg) / weekdayAvg)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: dayColors.weekday }} />
                    <span className="text-muted-foreground">Hari Kerja</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: dayColors.weekend }} />
                    <span className="text-muted-foreground">Akhir Pekan</span>
                </div>
            </div>
        </div>
    );
}
