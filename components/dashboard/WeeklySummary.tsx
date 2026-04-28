import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatRupiah } from '@/lib/format';

interface WeeklySummaryProps {
    data: Array<{
        date: string;
        revenue: number;
    }>;
}

export function WeeklySummary({ data }: WeeklySummaryProps) {
    return (
        <Card className="col-span-4 lg:col-span-4 bg-card border-border h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-foreground">Ringkasan Mingguan</CardTitle>
                <CardDescription className="text-muted-foreground">Pendapatan 7 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.25} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                            <XAxis
                                dataKey="date"
                                stroke="currentColor"
                                className="text-muted-foreground"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString('id-ID', { weekday: 'short' });
                                }}
                            />
                            <YAxis
                                stroke="#C5C4C0"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(212,175,55,0.06)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-2xl">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[0.70rem] uppercase tracking-wider text-muted-foreground font-semibold">
                                                        {new Date(payload[0].payload.date).toLocaleDateString('id-ID', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                        })}
                                                    </span>
                                                    <span className="text-lg font-bold text-primary">
                                                        {formatRupiah(payload[0].value as number)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="url(#colorRevenue)"
                                radius={[6, 6, 2, 2]}
                                maxBarSize={32}
                                animationDuration={1500}
                                activeBar={{
                                    fill: 'var(--primary)',
                                    stroke: 'var(--primary)',
                                    strokeWidth: 2,
                                    fillOpacity: 0.95,
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
