import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface TopItemsTableProps {
    data: Array<{
        name: string;
        count: number;
        revenue: number;
    }>;
}

export function TopItemsTable({ data }: TopItemsTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Menu Terpopuler</CardTitle>
                <CardDescription>
                    Daftar menu dengan penjualan tertinggi periode ini
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Menu</TableHead>
                            <TableHead className="text-right">Terjual</TableHead>
                            <TableHead className="text-right">Pendapatan</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.name}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                            {index + 1}
                                        </span>
                                        {item.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell className="text-right">
                                    {formatRupiah(item.revenue)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {index === 0 ? (
                                        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0">Top 1</Badge>
                                    ) : index < 3 ? (
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-0">
                                            Popular
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
