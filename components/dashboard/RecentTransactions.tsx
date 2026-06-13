import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Clock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { formatRupiah, formatTanggal } from '@/lib/format';

interface Transaction {
    id: string;
    createdAt: string | number | Date;
    paymentMethod: string;
    totalAmount: number;
    items: Array<{ name: string; qty: number }>;
    cashier_name?: string;
}

interface RecentTransactionsProps {
    transactions: Transaction[];
}

const paymentColors: Record<string, string> = {
    Tunai: 'border-emerald-500/30 text-emerald-400',
    QRIS: 'border-blue-500/30 text-blue-400',
    Debit: 'border-purple-500/30 text-purple-400',
    Transfer: 'border-amber-500/30 text-amber-400',
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="text-foreground">Transaksi Terbaru</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        {transactions.length > 0
                            ? '5 transaksi terakhir'
                            : 'Belum ada transaksi tercatat'}
                    </CardDescription>
                </div>
                <Link href="/transactions">
                    <Button variant="ghost" size="sm" className="gap-1">
                        Semua <ArrowUpRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="text-muted-foreground">Waktu</TableHead>
                                <TableHead className="text-muted-foreground">Item</TableHead>
                                <TableHead className="text-muted-foreground">Metode</TableHead>
                                <TableHead className="text-muted-foreground text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow className="border-border">
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Belum ada data transaksi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((t, i) => (
                                    <TableRow key={i} className="border-border/60 hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{formatTanggal(t.createdAt)}</span>
                                                {t.cashier_name && (
                                                    <span className="text-[10px] text-muted-foreground/70">oleh {t.cashier_name.split(' ')[0]}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground">{t.items[0]?.name}</span>
                                            {t.items.length > 1 && (
                                                <span className="text-xs text-muted-foreground ml-1">+{t.items.length - 1}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={paymentColors[t.paymentMethod] || ''}>
                                                {t.paymentMethod}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-foreground">
                                            {formatRupiah(t.totalAmount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Belum ada data transaksi
                        </div>
                    ) : (
                        transactions.map((t, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-background p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {formatTanggal(t.createdAt)}
                                        {t.cashier_name && <span>· {t.cashier_name.split(' ')[0]}</span>}
                                    </div>
                                    <Badge variant="outline" className={paymentColors[t.paymentMethod] || ''}>
                                        {t.paymentMethod}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium truncate">{t.items[0]?.name}</span>
                                        {t.items.length > 1 && (
                                            <span className="text-xs text-muted-foreground shrink-0">+{t.items.length - 1}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold ml-3 shrink-0">{formatRupiah(t.totalAmount)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
