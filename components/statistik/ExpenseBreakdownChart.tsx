'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRupiah } from '@/lib/format';
import { ExpenseSummary } from '@/types/finance';

interface ExpenseBreakdownChartProps {
  data: ExpenseSummary[];
}

const DEFAULT_COLORS = [
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#6366F1', // indigo-500
  '#6B7280', // gray-500
];

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  // Sort by amount descending
  const sortedData = [...data].sort((a, b) => b.total_amount - a.total_amount);
  
  // Assign colors
  const chartData = sortedData.map((item, index) => ({
    ...item,
    color: item.category_color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-1">
            {data.category_name}
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatRupiah(data.total_amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.percentage}% dari total
          </p>
          <p className="text-xs text-muted-foreground">
            {data.transaction_count} transaksi
          </p>
        </div>
      );
    }
    return null;
  };

  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground">Breakdown Pengeluaran</h3>
        <p className="text-xs text-muted-foreground">
          Total: {formatRupiah(totalAmount)}
        </p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="total_amount"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {chartData.slice(0, 5).map((item) => (
          <div key={item.category_id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-foreground">{item.category_name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-foreground">
                {formatRupiah(item.total_amount)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({item.percentage}%)
              </span>
            </div>
          </div>
        ))}
        {chartData.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{chartData.length - 5} kategori lainnya
          </p>
        )}
      </div>
    </div>
  );
}
