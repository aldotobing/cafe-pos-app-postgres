import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    className?: string;
    iconClassName?: string;
    valueClassName?: string;
    titleClassName?: string;
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className,
    iconClassName,
    valueClassName,
    titleClassName,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden h-full flex flex-col bg-card border-border relative group", className)}>
            {/* Background Decorative Icon - Tucked Top Right */}
            <div className="absolute right-2 top-2 pointer-events-none opacity-[0.05] group-hover:opacity-[0.08] group-hover:scale-105 transition-all duration-500 ease-out">
                <Icon className={cn("h-16 w-16", iconClassName?.split(' ').find(c => c.startsWith('text-')) || "text-primary")} />
            </div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10 pt-5 px-5">
                <CardTitle className={cn("text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70", titleClassName)}>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 px-5 pb-5">
                <div className={cn("text-3xl font-black text-foreground tracking-tighter", valueClassName)}>{value}</div>
                <p className="text-[11px] text-muted-foreground font-medium mt-1.5 leading-relaxed">{description}</p>
                {trend && (
                    <div className="flex items-center mt-3 text-[10px]">
                        <span
                            className={cn(
                                "font-bold px-1.5 py-0.5 rounded-md mr-1.5",
                                trend.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                            )}
                        >
                            {trend.positive ? "↑" : "↓"} {trend.value}%
                        </span>
                        <span className="text-muted-foreground/60 font-medium">{trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
