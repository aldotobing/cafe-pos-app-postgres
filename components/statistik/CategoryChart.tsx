import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryChartProps {
    data: Array<{
        name: string;
        value: number;
    }>;
}

const COLORS = [
    '#D4AF37', // Gold
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#F43F5E', // Rose
    '#84CC16', // Lime
];

// Fallback colors if CSS variables aren't set
const FALLBACK_COLORS = COLORS;

export function CategoryChart({ data }: CategoryChartProps) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl">Kategori Terlaris</CardTitle>
                <CardDescription>Distribusi penjualan berdasarkan kategori</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="h-[300px] sm:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius="45%"
                                outerRadius="75%"
                                paddingAngle={4}
                                dataKey="value"
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                                activeIndex={undefined}
                                activeShape={{
                                    fillOpacity: 0.8,
                                    stroke: "hsl(var(--primary))",
                                    strokeWidth: 2,
                                }}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border bg-background p-3 shadow-xl ring-1 ring-black/5 z-50">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                        {payload[0].name}
                                                    </span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="font-bold text-lg text-primary">
                                                            {payload[0].value}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                                            Item Terjual
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ 
                                    paddingTop: '20px',
                                    fontSize: '11px',
                                    fontWeight: '500'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
