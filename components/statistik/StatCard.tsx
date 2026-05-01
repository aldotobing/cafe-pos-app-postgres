import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
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
        <Card className={cn(
            "relative overflow-hidden rounded-lg border border-border shadow-subtle hover:shadow-md transition-all duration-300 group bg-card",
            className
        )}>
            {/* Content */}
            <CardContent className="relative z-10 p-5">
                {/* Header with icon and title */}
                <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                        <h3 className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", titleClassName)}>
                            {title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            {description}
                        </p>
                    </div>
                    
                    {/* Icon */}
                    <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center",
                        iconClassName?.includes('chart-1') && "bg-chart-1/5",
                        iconClassName?.includes('chart-2') && "bg-chart-2/5", 
                        iconClassName?.includes('chart-3') && "bg-chart-3/5",
                        iconClassName?.includes('chart-4') && "bg-chart-4/5",
                        !iconClassName && "bg-primary/5"
                    )}>
                        <Icon className={cn(
                            "w-4 h-4 opacity-40",
                            iconClassName?.includes('chart-1') && "text-chart-1",
                            iconClassName?.includes('chart-2') && "text-chart-2", 
                            iconClassName?.includes('chart-3') && "text-chart-3",
                            iconClassName?.includes('chart-4') && "text-chart-4",
                            !iconClassName && "text-primary"
                        )} />
                    </div>
                </div>
                
                {/* Value */}
                <div className="mb-3">
                    <div 
                        className={cn(
                            "font-bold text-foreground leading-tight",
                            "text-xl sm:text-2xl lg:text-3xl",
                            typeof value === 'string' && value.length > 12 ? "text-lg sm:text-xl lg:text-2xl" : "",
                            typeof value === 'string' && value.length > 18 ? "text-base sm:text-lg lg:text-xl" : "",
                            valueClassName
                        )}
                        title={typeof value === 'string' && value.length > 12 ? value : undefined}
                    >
                        {value}
                    </div>
                </div>
                
                {/* Trend */}
                {trend && (
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                            trend.positive 
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        )}>
                            {trend.positive ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{trend.value}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
