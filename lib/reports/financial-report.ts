import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../format';
import { CafeSettings } from '@/types';

interface ReportData {
    totalTransactions: number;
    totalRevenue: number;
    avgTransactionValue: number;
    totalSubtotal: number;
    totalTax: number;
    totalService: number;
    topSellingItems: Array<{
        name: string;
        count: number;
        revenue: number;
    }>;
    dailyRevenue: Array<{
        date: string;
        revenue: number;
    }>;
    categoryDistribution: Array<{
        name: string;
        value: number;
    }>;
    paymentBreakdown: Array<{
        name: string;
        count: number;
        total: number;
    }>;
}

export const generateFinancialReport = async (
    data: ReportData,
    dateRange: { from: Date; to: Date },
    settings: CafeSettings
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    type RGB = [number, number, number];
    const colors: Record<string, RGB> = {
        primary: [26, 32, 44],         // Deep navy
        primaryLight: [44, 62, 80],    // Dark slate
        accent: [212, 175, 55],        // Gold
        success: [34, 139, 34],        // Forest green
        muted: [113, 128, 150],        // Gray
        bgLight: [248, 250, 252],      // Light gray
        bgWhite: [255, 255, 255],
        border: [226, 232, 240],       // Light border
        textPrimary: [26, 32, 44],
        textSecondary: [100, 116, 139],
    };

    let yPosition = 20;

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
    doc.text('LAPORAN KINERJA KEUANGAN', 32, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.textSecondary);
    const periodText = `${format(dateRange.from, 'dd MMMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMMM yyyy', { locale: id })}`;
    doc.text(`Periode Fiskal: ${periodText}`, 32, 68);

    doc.setFontSize(8);
    doc.text(`Generated on: ${format(new Date(), "EEEE, dd MMMM yyyy, HH:mm", { locale: id })}`, 32, 74);

    // ==================== TABLE OF CONTENTS ====================
    yPosition = 110;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.text('DAFTAR ISI LAPORAN', margin + 10, yPosition);
    yPosition += 4;

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, yPosition, margin + 25, yPosition);
    yPosition += 12;

    const tocItems = [
        { num: 'I', title: 'Ringkasan Eksekutif', page: '02' },
        { num: 'II', title: 'Analisis Pendapatan Mendalam', page: '02' },
        { num: 'III', title: 'Indikator Kinerja Utama (KPI)', page: '03' },
        { num: 'IV', title: 'Metode Pembayaran & Settlement', page: '03' },
        { num: 'V', title: 'Performa Portfolio Produk', page: '04' },
        { num: 'VI', title: 'Tren Pertumbuhan Harian', page: '04' },
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

    // Executive summary text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.textSecondary);
    
    const summaryText = `Laporan keuangan resmi ini menyajikan analisis komprehensif terhadap performa operasional ${settings.name} selama periode ${periodText}. Dokumen ini disusun berdasarkan data transaksi yang tercatat dalam sistem Kasirku.biz.id dan telah diverifikasi keakuratannya.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 8;

    // Metrics in Modern Cards
    const metrics = [
        { label: 'Total Pendapatan', value: formatRupiah(data.totalRevenue) },
        { label: 'Total Transaksi', value: `${data.totalTransactions.toLocaleString('id-ID')}` },
        { label: 'Rerata Nilai Bon', value: formatRupiah(data.avgTransactionValue) },
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
    doc.text('Pendapatan & Komponen Biaya', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Pos Keuangan', 'Nominal (IDR)', 'Alokasi Pendapatan']],
        body: [
            ['Pendapatan Kotor (Subtotal)', formatRupiah(data.totalSubtotal || data.totalRevenue), `${data.totalRevenue > 0 ? (((data.totalSubtotal || data.totalRevenue) / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Retensi PPN (Tax)', formatRupiah(data.totalTax), `${data.totalRevenue > 0 ? ((data.totalTax / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Biaya Layanan Operasional', formatRupiah(data.totalService), `${data.totalRevenue > 0 ? ((data.totalService / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            [
                { content: 'TOTAL PENDAPATAN NETT', styles: { fontStyle: 'bold', textColor: colors.primary } },
                { content: formatRupiah(data.totalRevenue), styles: { fontStyle: 'bold', textColor: colors.primary } },
                { content: '100.0%', styles: { fontStyle: 'bold', textColor: colors.primary } }
            ],
        ],
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 4
        },
        styles: { 
            fontSize: 8.5, 
            cellPadding: 3.5,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.45 },
            1: { halign: 'right', cellWidth: contentWidth * 0.30 },
            2: { halign: 'right', cellWidth: contentWidth * 0.25 }
        },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;

    // Insight box
    doc.setFillColor(245, 250, 245);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'F');
    doc.setDrawColor(...colors.success);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.success);
    doc.text('Insight Keuangan:', margin + 4, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const insightText = `Berdasarkan ${data.totalTransactions} transaksi, rata-rata nilai per bon mencapai ${formatRupiah(data.avgTransactionValue)}. Ini menunjukkan ${data.avgTransactionValue > 50000 ? 'nilai transaksi yang solid' : 'potensi peningkatan nilai transaksi'}.`;
    const insightLines = doc.splitTextToSize(insightText, contentWidth - 15);
    doc.text(insightLines, margin + 4, yPosition + 12);

    // ==================== PAGE 3: KPI SECTION ====================
    doc.addPage();
    yPosition = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.primary);
    doc.text('Key Performance Indicators', margin, yPosition);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
    yPosition += 15;

    const totalItemsSold = data.topSellingItems.reduce((acc, item) => acc + item.count, 0);
    const avgItemsPerTx = data.totalTransactions > 0 ? totalItemsSold / data.totalTransactions : 0;

    autoTable(doc, {
        startY: yPosition,
        head: [['Metrik Operasional', 'Nilai Capaian', 'Evaluasi']],
        body: [
            ['Volume Transaksi', `${data.totalTransactions.toLocaleString('id-ID')} Tx`, data.totalTransactions > 50 ? 'OPTIMAL' : 'AVERAGE'],
            ['Average Order Value (AOV)', formatRupiah(data.avgTransactionValue), data.avgTransactionValue > 30000 ? 'STABLE' : 'GROWTH POTENTIAL'],
            ['Inventory Turnover (Item)', `${totalItemsSold.toLocaleString('id-ID')} Units`, '-'],
            ['Average Items Per Basket', avgItemsPerTx.toFixed(1) + ' units', avgItemsPerTx > 2 ? 'EFFICIENT' : 'STANDARD'],
            ['Unit Economic Revenue', totalItemsSold > 0 ? formatRupiah(data.totalRevenue / totalItemsSold) : '-', '-'],
        ],
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 4
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 3.5,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.40, fontStyle: 'bold' },
            1: { halign: 'right', cellWidth: contentWidth * 0.35 },
            2: { halign: 'center', cellWidth: contentWidth * 0.25 }
        },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;

    // ==================== SECTION 4: PAYMENT ANALYSIS ====================
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Analisis Metode Pembayaran', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Kanal Pembayaran', 'Frekuensi', 'Volume (IDR)', 'Pangsa Pasar']],
        body: data.paymentBreakdown.map(p => [
            p.name,
            `${p.count}x`,
            formatRupiah(p.total),
            `${((p.total / data.totalRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 4
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 3.5,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.35, fontStyle: 'bold' },
            1: { halign: 'center', cellWidth: contentWidth * 0.20 },
            2: { halign: 'right', cellWidth: contentWidth * 0.25 },
            3: { halign: 'right', cellWidth: contentWidth * 0.20 }
        },
        foot: [
            ['Consolidated Settlement', `${data.totalTransactions}x`, formatRupiah(data.totalRevenue), '100%']
        ],
        footStyles: { 
            fontStyle: 'bold', 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontSize: 9.5,
            cellPadding: 4
        },
    });

    // ==================== PAGE 4: PRODUCT & CATEGORY ====================
    doc.addPage();
    yPosition = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.primary);
    doc.text('Performa Portfolio Produk', margin, yPosition);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
    yPosition += 15;

    // Top Products
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.primaryLight);
    doc.text('5.1. Produk Terlaris (Top 5)', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['No.', 'Nama Produk/Layanan', 'Qty', 'Revenue (IDR)', 'Porsi']],
        body: data.topSellingItems.map((item, index) => [
            `0${index + 1}`,
            item.name,
            `${item.count} Units`,
            formatRupiah(item.revenue),
            `${((item.revenue / data.totalRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3.5
        },
        styles: { 
            fontSize: 8.5, 
            cellPadding: 3,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { halign: 'center', cellWidth: contentWidth * 0.10, fontStyle: 'bold' },
            1: { cellWidth: contentWidth * 0.35 },
            2: { halign: 'center', cellWidth: contentWidth * 0.15 },
            3: { halign: 'right', cellWidth: contentWidth * 0.25 },
            4: { halign: 'right', cellWidth: contentWidth * 0.15 }
        },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Category Performance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.primaryLight);
    doc.text('5.2. Performa Berdasarkan Kategori', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Kategori Utama', 'Subtotal Revenue', 'Share', 'Yield Per Cat']],
        body: data.categoryDistribution.map((cat, index) => [
            cat.name,
            formatRupiah(cat.value),
            `${((cat.value / data.totalRevenue) * 100).toFixed(1)}%`,
            formatRupiah(data.categoryDistribution.length > 0 ? cat.value / data.categoryDistribution.length : 0)
        ]),
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 4
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 3.5,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.25, fontStyle: 'bold' },
            1: { halign: 'right', cellWidth: contentWidth * 0.25 },
            2: { halign: 'right', cellWidth: contentWidth * 0.20 },
            3: { halign: 'right', cellWidth: contentWidth * 0.30 }
        },
        foot: [
            ['Total Portfolio', formatRupiah(data.totalRevenue), '100%', formatRupiah(data.totalRevenue / data.categoryDistribution.length)]
        ],
        footStyles: { 
            fontStyle: 'bold', 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontSize: 9.5,
            cellPadding: 4
        },
    });

    // ==================== SECTION 6: DAILY TREND ====================
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Tren Pertumbuhan Harian', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
        startY: yPosition,
        head: [['Label Tanggal', 'Hari', 'Pendapatan Harian', 'Kontribusi']],
        body: data.dailyRevenue.map(day => {
            const date = new Date(day.date);
            return [
                format(date, 'dd MMM yyyy', { locale: id }),
                format(date, 'EEEE', { locale: id }),
                formatRupiah(day.revenue),
                `${((day.revenue / data.totalRevenue) * 100).toFixed(1)}%`
            ];
        }),
        theme: 'striped',
        headStyles: { 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3.5
        },
        styles: { 
            fontSize: 8.5, 
            cellPadding: 3,
            lineColor: colors.border,
            lineWidth: 0.1
        },
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.20 },
            1: { cellWidth: contentWidth * 0.20 },
            2: { halign: 'right', cellWidth: contentWidth * 0.40 },
            3: { halign: 'right', cellWidth: contentWidth * 0.20 }
        },
        foot: [
            ['Consolidated Growth', `${data.dailyRevenue.length} Days`, formatRupiah(data.totalRevenue), '100.0%']
        ],
        footStyles: { 
            fontStyle: 'bold', 
            fillColor: colors.bgLight, 
            textColor: colors.primary,
            fontSize: 9,
            cellPadding: 3.5
        },
    });

    // ==================== SIGNATURES & APPROVAL ====================
    let sigLineY = (doc as any).lastAutoTable.finalY + 30;
    const sigBoxWidth = 65;

    if (sigLineY > 230) {
        doc.addPage();
        sigLineY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colors.primary);
    doc.text('Otorisasi & Persetujuan Keuangan', margin, sigLineY);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, sigLineY + 3, margin + 15, sigLineY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.textSecondary);
    doc.text('Laporan ini validasikan secara finansial untuk kebutuhan audit internal.', margin, sigLineY + 12);

    const sigY2 = sigLineY + 20;
    
    // Prepared by
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

    // Approved by
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

    // ==================== FOOTER ON ALL PAGES ====================
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Subtle line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.2);
        doc.line(margin, doc.internal.pageSize.height - 20, pageWidth - margin, doc.internal.pageSize.height - 20);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);

        doc.text(
            `${settings.name} — Laporan Keuangan Resmi | Kasirku.biz.id`,
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
    const filename = `Laporan_Keuangan_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(filename);
};
