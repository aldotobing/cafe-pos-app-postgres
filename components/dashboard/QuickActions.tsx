import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, ShoppingBag, FileBarChart, Settings } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
    return (
        <Card className="bg-card border-border h-full w-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-foreground">Akses Cepat</CardTitle>
                <CardDescription className="text-muted-foreground">Pintasan ke fitur yang sering digunakan</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 flex-1">
                <Link href="/pos" className="block">
                    <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1.5 sm:gap-2 hover:border-primary hover:text-primary transition-colors bg-muted/50 border-border text-foreground">
                        <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-xs sm:text-sm">Transaksi Baru</span>
                    </Button>
                </Link>
                <Link href="/menu" className="block">
                    <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1.5 sm:gap-2 hover:border-primary hover:text-primary transition-colors bg-muted/50 border-border text-foreground">
                        <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-xs sm:text-sm">Kelola Barang</span>
                    </Button>
                </Link>
                <Link href="/reports/profit" className="block">
                    <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1.5 sm:gap-2 hover:border-primary hover:text-primary transition-colors bg-muted/50 border-border text-foreground">
                        <FileBarChart className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-xs sm:text-sm">Laporan</span>
                    </Button>
                </Link>
                <Link href="/settings" className="block">
                    <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1.5 sm:gap-2 hover:border-primary hover:text-primary transition-colors bg-muted/50 border-border text-foreground">
                        <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-xs sm:text-sm">Pengaturan</span>
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
