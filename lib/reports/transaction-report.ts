import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../format';
import { CafeSettings } from '@/types';

interface Transaction {
    id: string;
    items: Array<{ 
        name?: string; 
        menu_name?: string; 
        qty?: number; 
        quantity?: number; 
        price: number; 
        lineTotal?: number 
    }>;
    totalAmount?: number;
    subtotal?: number;
    taxAmount?: number;
    serviceCharge?: number;
    paymentMethod?: string;
    orderNote?: string;
    createdAt: string | number;
    created_by: string;
}

interface User {
    id: string;
    full_name: string;
}

interface ReportOptions {
    transactions: Transaction[];
    users: User[];
    dateRange: { from: Date; to: Date };
    settings: CafeSettings;
    filters: {
        method: string;
        user: string;
    };
}

export const generateTransactionReport = async (options: ReportOptions) => {
    const { transactions, users, dateRange, settings, filters } = options;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    type RGB = [number, number, number];
    const colors: Record<string, RGB> = {
        primary: [26, 32, 44],
        primaryLight: [44, 62, 80],
        accent: [212, 175, 55],
        success: [34, 139, 34],
        muted: [113, 128, 150],
        bgLight: [248, 250, 252],
        bgWhite: [255, 255, 255],
        border: [226, 232, 240],
        textPrimary: [26, 32, 44],
        textSecondary: [100, 116, 139],
    };

    let yPosition = 20;

    // Helper to get user name
    const getUserName = (userId: string) => {
        const invalidValues = ['local', 'system', 'unknown', null, undefined, ''];
        if (invalidValues.includes(userId)) return '-';
        const user = users.find(u => String(u.id) === String(userId));
        return user ? user.full_name : 'Unknown';
    };

    // Calculate statistics
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;
    const totalTax = transactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);
    const totalService = transactions.reduce((sum, t) => sum + (t.serviceCharge || 0), 0);
    const totalItems = transactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + (i.qty || i.quantity || 0), 0), 0);

    // Payment method breakdown
    const paymentMap: Record<string, { count: number; total: number }> = {};
    transactions.forEach(tx => {
        const method = tx.paymentMethod || 'Unknown';
        if (!paymentMap[method]) {
            paymentMap[method] = { count: 0, total: 0 };
        }
        paymentMap[method].count += 1;
        paymentMap[method].total += (tx.totalAmount || 0);
    });
    const paymentBreakdown = Object.entries(paymentMap).map(([name, data]) => ({ name, ...data }));

    // Hourly distribution
    const hourlyMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
    transactions.forEach(tx => {
        const hour = new Date(tx.createdAt).getHours();
        hourlyMap[hour] += (tx.totalAmount || 0);
    });
    const hourlyDistribution = Object.entries(hourlyMap)
        .map(([hour, total]) => ({ hour: parseInt(hour), total }))
        .filter(h => h.total > 0)
        .sort((a, b) => a.hour - b.hour);

    // ==================== COVER PAGE ====================
    // Modern Gradient-like Sidebar
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 8, 297, 'F'); 
    
    // Main Header Block
    doc.setFillColor(252, 252, 253);
    doc.rect(8, 0, pageWidth - 8, 85, 'F');
    
    doc.setFillColor(...colors.accent);
    doc.rect(25, 30, 2, 40, 'F'); // Vertical accent bar

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...colors.primary);
    doc.text(settings.name.toUpperCase(), 32, 42);

    if (settings.tagline) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.textSecondary);
        doc.text(settings.tagline, 32, 48);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...colors.accent);
    doc.text('REPORT PEMBUKUAN HARIAN', 32, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.textSecondary);
    const periodText = `${format(dateRange.from, 'dd MMMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMMM yyyy', { locale: id })}`;
    doc.text(`Periode Operasional: ${periodText}`, 32, 68);

    doc.setFontSize(8);
    doc.text(`Generated on: ${format(new Date(), "EEEE, dd MMMM yyyy, HH:mm", { locale: id })}`, 32, 74);

    // ==================== TABLE OF CONTENTS ====================
    yPosition = 110;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.text('DAFTAR ISI', margin + 10, yPosition);
    yPosition += 4;

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, yPosition, margin + 25, yPosition);
    yPosition += 12;

    const tocItems = [
        { num: '01', title: 'Ringkasan Eksekutif', page: '02' },
        { num: '02', title: 'Analisis Keuangan', page: '02' },
        { num: '03', title: 'Analisis Waktu & Trend', page: '03' },
        { num: '04', title: 'Performa Staff Kasir', page: '03' },
        { num: '05', title: 'Metode Pembayaran', page: '04' },
        { num: '06', title: 'Data Transaksi Terperinci', page: '05' },
    ];

    tocItems.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.primary);
        doc.text(item.num, margin + 10, yPosition);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.textSecondary);
        doc.text(item.title, margin + 20, yPosition);
        
        doc.setFont('helvetica', 'italic');
        doc.text(item.page, pageWidth - margin - 10, yPosition, { align: 'right' });
        
        yPosition += 8;
    });

    // ==================== PAGE 2: EXECUTIVE SUMMARY ====================
    doc.addPage();
    yPosition = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.primary);
    doc.text('Ringkasan Eksekutif', margin, yPosition);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.textSecondary);
    
    const filterDesc = [];
    if (filters.method !== 'Semua') filterDesc.push(`Metode: ${filters.method}`);
    if (filters.user !== 'Semua') {
        const userName = getUserName(filters.user);
        filterDesc.push(`Kasir: ${userName}`);
    }
    const filterText = filterDesc.length > 0 ? ` (Filter: ${filterDesc.join(', ')})` : '';

    const summaryText = `Laporan detail transaksi ${settings.name} periode ${periodText}${filterText}. Total ${transactions.length} transaksi tercatat dengan pendapatan kotor sebesar ${formatRupiah(totalRevenue)}. Dokumen ini menyajikan analisis mendalam per kasir, metode pembayaran, dan rincian lengkap setiap transaksi.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 10;

    // Metrics in Modern Cards
    const metrics = [
        { label: 'Total Pendapatan', value: formatRupiah(totalRevenue) },
        { label: 'Jumlah Transaksi', value: `${transactions.length.toLocaleString('id-ID')}` },
        { label: 'Rata-rata per Bon', value: formatRupiah(avgTransaction) },
    ];

    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 30;
    const cardGap = 5;

    metrics.forEach((metric, index) => {
        const x = margin + (index * (cardWidth + cardGap));
        
        // Card Body
        doc.setFillColor(252, 252, 253);
        doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'F');
        doc.setDrawColor(235, 238, 241);
        doc.setLineWidth(0.1);
        doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'S');

        // Label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...colors.textSecondary);
        doc.text(metric.label.toUpperCase(), x + 5, yPosition + 8);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text(metric.value, x + 5, yPosition + 18);
        
        // Sub-accent
        doc.setFillColor(...colors.accent);
        doc.rect(x + 5, yPosition + 22, 10, 0.5, 'F');
    });

    yPosition += cardHeight + 15;

    // ==================== SECTION 2: FINANCIAL ANALYSIS ====================
    yPosition += cardHeight + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Rangkuman Komponen Keuangan', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Komponen Keuangan', 'Nilai (IDR)', 'Portofolio']],
        body: [
            ['Total Subtotal Transaksi', formatRupiah(transactions.reduce((s, t) => s + (t.subtotal || 0), 0)), '100%'],
            ['Total PPN (Tax)', formatRupiah(totalTax), `${totalRevenue > 0 ? ((totalTax / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Biaya Layanan', formatRupiah(totalService), `${totalRevenue > 0 ? ((totalService / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            [
                { content: 'TOTAL PENDAPATAN BERSIH', styles: { fontStyle: 'bold', textColor: colors.primary } },
                { content: formatRupiah(totalRevenue), styles: { fontStyle: 'bold', textColor: colors.primary } },
                { content: '100.0%', styles: { fontStyle: 'bold', textColor: colors.primary } }
            ],
        ],
        theme: 'striped',
        headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
        styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: colors.border, lineWidth: 0.1 },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.44 }, 
            1: { halign: 'right', cellWidth: contentWidth * 0.30 }, 
            2: { halign: 'right', cellWidth: contentWidth * 0.25 } 
        },
        margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;

    // Modern Info Box
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 1, 1, 'F');
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPosition, 1, 20, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.primary);
    doc.text('Statistik Operasional:', margin + 4, yPosition + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    const statsText = `Daftar ini mencakup ${totalItems} unit item terjual dengan rata-rata ${transactions.length > 0 ? (totalItems / transactions.length).toFixed(1) : '0'} item/transaksi. Transaksi puncak tercatat pada nilai ${transactions.length > 0 ? formatRupiah(Math.max(...transactions.map(t => t.totalAmount || 0))) : '-'}.`;
    doc.text(doc.splitTextToSize(statsText, contentWidth - 10), margin + 4, yPosition + 13);

    // ==================== PAGE 3: OPERATIONAL ANALYSIS ====================
    doc.addPage();
    yPosition = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.primary);
    doc.text('Analisis Waktu & Tren', margin, yPosition);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
    yPosition += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.primaryLight);
    doc.text('Distribusi Penjualan per Jam', margin, yPosition);
    yPosition += 6;

    autoTable(doc, {
        startY: yPosition,
        head: [['Jam Operasional', 'Total Omzet (IDR)', 'Kontribusi (%)']],
        body: hourlyDistribution.map(h => [
            `${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour + 1).padStart(2, '0')}:00`,
            formatRupiah(h.total),
            `${((h.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 8.5, cellPadding: 3 },
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: colors.border, lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.40 },
            1: { halign: 'right', cellWidth: contentWidth * 0.35 },
            2: { halign: 'right', cellWidth: contentWidth * 0.24 }
        },
        margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Performa Staff Kasir', margin, yPosition);
    yPosition += 8;

    const cashierMap: Record<string, { count: number; total: number }> = {};
    transactions.forEach(tx => {
        const userName = getUserName(tx.created_by);
        if (!cashierMap[userName]) cashierMap[userName] = { count: 0, total: 0 };
        cashierMap[userName].count += 1;
        cashierMap[userName].total += (tx.totalAmount || 0);
    });
    const cashierPerformance = Object.entries(cashierMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

    autoTable(doc, {
        startY: yPosition,
        head: [['Staff Kasir', 'Vol. Transaksi', 'Omzet Bruto', 'Rerata Bon', 'Porsi']],
        body: cashierPerformance.map(c => [
            c.name,
            `${c.count}x`,
            formatRupiah(c.total),
            formatRupiah(c.total / c.count),
            `${((c.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
        styles: { fontSize: 8, cellPadding: 3, lineColor: colors.border, lineWidth: 0.1 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: contentWidth * 0.24 },
            1: { halign: 'center', cellWidth: contentWidth * 0.19 },
            2: { halign: 'right', cellWidth: contentWidth * 0.19 },
            3: { halign: 'right', cellWidth: contentWidth * 0.19 },
            4: { halign: 'right', cellWidth: contentWidth * 0.18 }
        },
        foot: [
            ['Total Keseluruhan', `${transactions.length}x`, formatRupiah(totalRevenue), formatRupiah(avgTransaction), '100%']
        ],
        footStyles: { fontStyle: 'bold', fillColor: colors.bgLight, textColor: colors.primary, fontSize: 8.5 },
        margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ==================== SECTION 4: PAYMENT METHODS ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Distribusi Metode Pembayaran', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Metode Pembayaran', 'Frekuensi', 'Volume Penjualan', 'Pangsa Pasar']],
        body: paymentBreakdown.map(p => [
            p.name,
            `${p.count}x`,
            formatRupiah(p.total),
            `${((p.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
        styles: { fontSize: 8, cellPadding: 3, lineColor: colors.border, lineWidth: 0.1 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: contentWidth * 0.34 },
            1: { halign: 'center', cellWidth: contentWidth * 0.19 },
            2: { halign: 'right', cellWidth: contentWidth * 0.25 },
            3: { halign: 'right', cellWidth: contentWidth * 0.21 }
        },
        foot: [
            ['Total Pembayaran', `${transactions.length}x`, formatRupiah(totalRevenue), '100%']
        ],
        footStyles: { fontStyle: 'bold', fillColor: colors.bgLight, textColor: colors.primary, fontSize: 8.5 },
        margin: { left: margin, right: margin }
    });

    // ==================== PAGE 4+: DETAILED TRANSACTIONS ====================
    doc.addPage();
    yPosition = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.primary);
    doc.text('Jurnal Transaksi Terperinci', margin, yPosition);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
    yPosition += 15;

    // Flatten transactions: one row per item
    const detailedRows: any[] = [];
    let rowNumber = 0;
    
    transactions.forEach((t) => {
        rowNumber++;
        const timeStr = format(new Date(t.createdAt), 'dd/MM HH:mm', { locale: id });
        const cashierName = getUserName(t.created_by);
        
        t.items.forEach((item, itemIndex) => {
            detailedRows.push([
                itemIndex === 0 ? rowNumber : '',
                itemIndex === 0 ? timeStr : '', // Only show time on first item
                itemIndex === 0 ? cashierName : '', // Only show cashier on first item
                `${item.name || item.menu_name || 'Item'} (x${item.qty || item.quantity || 0})`,
                formatRupiah(item.lineTotal || 0),
                itemIndex === 0 ? formatRupiah(t.taxAmount || 0) : '',
                itemIndex === 0 ? formatRupiah(t.serviceCharge || 0) : '',
                itemIndex === 0 ? formatRupiah(t.totalAmount || 0) : '',
                itemIndex === 0 ? (t.paymentMethod || '-') : ''
            ]);
        });
    });

    autoTable(doc, {
        startY: yPosition,
        head: [['No', 'Waktu', 'Kasir', 'Item Vendor', 'Bruto', 'Tax', 'Svc', 'Nett', 'Metode']],
        body: detailedRows,
        theme: 'striped',
        headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        styles: { fontSize: 6.5, cellPadding: 1.5, lineColor: colors.border, lineWidth: 0.1 },
        columnStyles: {
            0: { halign: 'center', cellWidth: contentWidth * 0.05 },
            1: { cellWidth: contentWidth * 0.10 },
            2: { cellWidth: contentWidth * 0.12 },
            3: { cellWidth: contentWidth * 0.22 },
            4: { halign: 'right', cellWidth: contentWidth * 0.11 },
            5: { halign: 'right', cellWidth: contentWidth * 0.08 },
            6: { halign: 'right', cellWidth: contentWidth * 0.08 },
            7: { halign: 'right', cellWidth: contentWidth * 0.11, fontStyle: 'bold' },
            8: { cellWidth: contentWidth * 0.12 }
        },
        margin: { left: margin, right: margin }
    });

    // Add totals summary after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Konsolidasi:', margin, finalY);
    
    const summaryData = [
        ['Total Subtotal (Bruto)', formatRupiah(transactions.reduce((s, t) => s + (t.subtotal || 0), 0))],
        ['Total PPN 11% (Tax)', formatRupiah(totalTax)],
        ['Total Service Charge', formatRupiah(totalService)],
        ['TOTAL AKHIR (Nett)', formatRupiah(totalRevenue)]
    ];

    autoTable(doc, {
        startY: finalY + 4,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.69 },
            1: { halign: 'right', cellWidth: contentWidth * 0.30 }
        },
        margin: { left: margin, right: margin }
    });

    // ==================== SIGNATURES ====================
    let sigY = (doc as any).lastAutoTable.finalY + 30;
    const sigBoxWidth = 65;

    if (sigY > 230) {
        doc.addPage();
        sigY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Otorisasi & Persetujuan', margin, sigY);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, sigY + 3, margin + 15, sigY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.textSecondary);
    doc.text('Dokumen validasi transaksi yang disahkan secara sistem.', margin, sigY + 12);

    const sigY2 = sigY + 20;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.textPrimary);
    doc.text('Disiapkan Oleh:', margin, sigY2);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.line(margin, sigY2 + 20, margin + sigBoxWidth, sigY2 + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    doc.text('( Bagian Keuangan )', margin + sigBoxWidth / 2, sigY2 + 26, { align: 'center' });
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, margin + sigBoxWidth / 2, sigY2 + 32, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.textPrimary);
    doc.text('Disetujui Oleh:', pageWidth - margin - sigBoxWidth, sigY2);
    doc.line(pageWidth - margin - sigBoxWidth, sigY2 + 20, pageWidth - margin, sigY2 + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    doc.text('( Manager / Owner )', pageWidth - margin - sigBoxWidth / 2, sigY2 + 26, { align: 'center' });
    doc.text(`Tanggal: ________________`, pageWidth - margin - sigBoxWidth / 2, sigY2 + 32, { align: 'center' });

    // ==================== FOOTER ====================
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.2);
        doc.line(margin, doc.internal.pageSize.height - 20, pageWidth - margin, doc.internal.pageSize.height - 20);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);

        doc.text(
            `${settings.name} — Laporan Transaksi | Kasirku.biz.id`,
            pageWidth / 2,
            doc.internal.pageSize.height - 15,
            { align: 'center' }
        );

        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            pageWidth - margin,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        );

        doc.text(
            format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id }),
            margin,
            doc.internal.pageSize.height - 10
        );
    }

    // Save PDF
    const filename = `Laporan_Transaksi_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(filename);
};
