import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatRupiah } from '@/lib/format';

interface HourlyChartProps {
    data: Array<{
        hour: string;
        transactions: number;
        revenue: number;
    }>;
}

export function HourlyChart({ data }: HourlyChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Jam Sibuk</CardTitle>
                <CardDescription>
                    Distribusi transaksi dan pendapatan per jam
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Tidak ada data untuk periode ini
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis
                                    dataKey="hour"
                                    stroke="#a1a1aa"
                                    className="text-muted-foreground"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#a1a1aa"
                                    className="text-muted-foreground"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#a1a1aa"
                                    className="text-muted-foreground"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                        return `${value}`;
                                    }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#EDECE8', opacity: 0.1 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-3 shadow-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Jam {payload[0].payload.hour}:00
                                                        </span>
                                                        <span className="font-semibold text-sm">
                                                            {payload[0].payload.transactions} transaksi
                                                        </span>
                                                        <span className="font-bold text-sm text-primary">
                                                            {formatRupiah(payload[0].payload.revenue)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="transactions"
                                    fill="#D4AF37"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
