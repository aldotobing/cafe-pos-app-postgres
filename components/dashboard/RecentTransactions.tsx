import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
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

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
    return (
        <Card className="col-span-4 lg:col-span-3 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-foreground">Transaksi Terbaru</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        {transactions.length > 0
                            ? `5 transaksi terakhir dari total ${transactions.length} transaksi`
                            : 'Belum ada transaksi tercatat'}
                    </CardDescription>
                </div>
                <Link href="/transactions">
                    <Button variant="ghost" size="sm" className="gap-1 text-foreground hover:text-primary">
                        Lihat Semua <ArrowUpRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
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
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-foreground">{formatTanggal(t.createdAt)}</span>
                                            {t.cashier_name && (
                                                <span className="text-[10px] text-muted-foreground/70 font-normal">
                                                    oleh {t.cashier_name.split(' ')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{t.items[0]?.name}</span>
                                            {t.items.length > 1 && (
                                                <span className="text-xs text-muted-foreground">
                                                    +{t.items.length - 1} item lainnya
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal bg-muted/50 text-foreground border-border">
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
            </CardContent>
        </Card>
    );
}
