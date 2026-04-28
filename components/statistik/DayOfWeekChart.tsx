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

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
    // Ensure all 7 days are present
    const fullData = Array.from({ length: 7 }, (_, i) => {
        const existing = data.find(d => d.dayIndex === i);
        return existing || { dayIndex: i, day: DAY_LABELS[i], transactions: 0, revenue: 0 };
    }).sort((a, b) => a.dayIndex - b.dayIndex);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perbandingan Hari</CardTitle>
                <CardDescription>
                    Aktivitas penjualan berdasarkan hari
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fullData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                                dataKey="day"
                                stroke="#a1a1aa"
                                className="text-muted-foreground"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#a1a1aa"
                                className="text-muted-foreground"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: '#EDECE8', opacity: 0.1 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                        const dayIndex = Object.keys(DAY_LABELS).find(k => DAY_LABELS[parseInt(k)] === payload[0].payload.day);
                                        return (
                                            <div className="rounded-lg border bg-background p-3 shadow-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        {fullDayNames[parseInt(dayIndex || '0')]}
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
                                dataKey="transactions"
                                fill="#D4AF37"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
