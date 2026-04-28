import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Line,
    LineChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatRupiah } from '@/lib/format';

interface RevenueChartProps {
    data: Array<{
        date: string;
        revenue: number;
    }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pendapatan</CardTitle>
                <CardDescription>
                    Grafik pendapatan harian dalam periode yang dipilih
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Tidak ada data pendapatan untuk periode ini
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#a1a1aa"
                                    className="text-muted-foreground"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        const [year, month, day] = value.split('-');
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                        return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
                                    }}
                                />
                                <YAxis
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
                                            const dateStr = payload[0].payload.date;
                                            const [year, month, day] = dateStr.split('-');
                                            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                            return (
                                                <div className="rounded-lg border bg-background p-3 shadow-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            {days[dateObj.getDay()]}, {parseInt(day)} {months[parseInt(month) - 1]} {year}
                                                        </span>
                                                        <span className="font-bold text-lg text-primary">
                                                            {formatRupiah(payload[0].value as number)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#D4AF37"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF', stroke: '#D4AF37' }}
                                    activeDot={{ r: 6, strokeWidth: 3, fill: '#D4AF37', stroke: '#FFFFFF' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
