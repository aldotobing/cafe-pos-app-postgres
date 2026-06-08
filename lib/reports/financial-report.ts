import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../format';
import { CafeSettings } from '@/types';
import { loadImageAsBase64 } from './image-utils';

interface ReportData {
    totalTransactions: number;
    totalRevenue: number;
    avgTransactionValue: number;
    totalSubtotal: number;
    totalDiscount: number;
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

type RGB = [number, number, number];

export const generateFinancialReport = async (
    data: ReportData,
    dateRange: { from: Date; to: Date },
    settings: CafeSettings
) => {
    const doc = new jsPDF('p');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 16;
    const contentWidth = pageWidth - (margin * 2);
    const footerHeight = 18;

    const COLORS: Record<string, RGB> = {
        primary: [30, 41, 59],
        secondary: [71, 85, 105],
        accent: [37, 99, 235],
        success: [22, 101, 52],
        warning: [180, 83, 9],
        danger: [153, 27, 27],
        muted: [100, 116, 139],
        lightBg: [248, 250, 252],
        border: [203, 213, 225],
    };

    const drawFooter = (pageData: any) => {
        const count = (doc as any).internal.getNumberOfPages();
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${settings.name} — Laporan Kinerja Keuangan`, pageWidth / 2, pageHeight - 13, { align: 'center' });
        doc.text(`Hal ${count} / ${count}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id }), margin, pageHeight - 8);
    };

    const atOptions = (overrides: Record<string, any> = {}): Record<string, any> => ({
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.lightBg, textColor: COLORS.primary, fontStyle: 'bold', fontSize: 9 },
        margin: { left: margin, right: margin, bottom: footerHeight + 4 },
        didDrawPage: drawFooter,
        ...overrides,
    });

    const periodText = `${format(dateRange.from, 'dd MMMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMMM yyyy', { locale: id })}`;

    let logoData: string | null = null;
    if (settings.logoUrl) {
        logoData = await loadImageAsBase64(settings.logoUrl);
    }

    // ==================== COVER PAGE ====================
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 0, pageWidth, 90, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(0, 90, pageWidth, 90);

    let textX = margin;
    if (logoData) {
        const logoSize = 24;
        try {
            doc.addImage(logoData, 'PNG', margin, 20, logoSize, logoSize);
        } catch { /* skip */ }
        textX = margin + logoSize + 12;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary);
    doc.text(settings.name, textX, 34);

    if (settings.tagline) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.secondary);
        doc.text(settings.tagline, textX, 42);
    }

    const details: string[] = [];
    if (settings.address) details.push(settings.address);
    if (settings.phone) details.push(settings.phone);
    if (details.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        const detailLines = doc.splitTextToSize(details.join('  |  '), pageWidth - textX - margin);
        doc.text(detailLines, textX, 50);
    }

    const titleY = 110;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.primary);
    doc.text('LAPORAN KINERJA KEUANGAN', pageWidth / 2, titleY, { align: 'center' });

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(1.5);
    doc.line(pageWidth / 2 - 40, titleY + 5, pageWidth / 2 + 40, titleY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Periode Fiskal: ${periodText}`, pageWidth / 2, titleY + 17, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Dibuat: ${format(new Date(), "EEEE, dd MMMM yyyy, HH:mm", { locale: id })}`, pageWidth / 2, titleY + 26, { align: 'center' });
    doc.text(`${data.totalTransactions} transaksi  |  ${data.totalRevenue > 0 ? formatRupiah(data.totalRevenue) : 'Rp0'} total pendapatan`, pageWidth / 2, titleY + 34, { align: 'center' });

    // ==================== TABLE OF CONTENTS ====================
    let tocY = titleY + 52;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text('DAFTAR ISI', margin, tocY);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, tocY + 3, margin + 34, tocY + 3);
    tocY += 14;

    const tocItems = [
        { num: 'I', title: 'Ringkasan Eksekutif' },
        { num: 'II', title: 'Analisis Pendapatan Mendalam' },
        { num: 'III', title: 'Indikator Kinerja Utama (KPI)' },
        { num: 'IV', title: 'Metode Pembayaran & Settlement' },
        { num: 'V', title: 'Performa Portfolio Produk' },
        { num: 'VI', title: 'Tren Pertumbuhan Harian' },
    ];

    tocItems.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.primary);
        doc.text(item.num, margin + 6, tocY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.secondary);
        doc.text(item.title, margin + 18, tocY);
        tocY += 11;
    });

    // Cover footer
    drawFooter(null);

    // ==================== SECTION HEADER HELPER ====================
    let y = 24;

    const sectionHeader = (title: string, subtitle?: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.primary);
        doc.text(title, margin, y);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.8);
        doc.line(margin, y + 4, margin + 30, y + 4);
        y += 14;
        if (subtitle) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.muted);
            doc.text(subtitle, margin, y);
            y += 11;
        }
    };

    // ==================== PAGE 2: EXECUTIVE SUMMARY ====================
    doc.addPage();
    y = 24;
    sectionHeader('Ringkasan Eksekutif');

    // Executive summary text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.secondary);

    const summaryText = `Laporan keuangan resmi ini menyajikan analisis komprehensif terhadap performa operasional ${settings.name} selama periode ${periodText}. Dokumen ini disusun berdasarkan data transaksi yang tercatat dalam sistem Kasirku.biz.id dan telah diverifikasi keakuratannya.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5.5 + 16;

    // Key Metrics cards
    const metrics = [
        { label: 'Total Pendapatan', value: formatRupiah(data.totalRevenue), color: COLORS.primary },
        { label: 'Total Transaksi', value: `${data.totalTransactions.toLocaleString('id-ID')}`, color: COLORS.secondary },
        { label: 'Rerata Nilai Bon', value: formatRupiah(data.avgTransactionValue), color: COLORS.accent },
    ];

    const cardWidth = (contentWidth - 12) / 3;
    const cardHeight = 32;

    metrics.forEach((metric, index) => {
        const x = margin + (index * (cardWidth + 6));

        // Card Body
        doc.setFillColor(249, 250, 251);
        doc.rect(x, y, cardWidth, cardHeight, 'F');
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cardWidth, cardHeight, 'S');

        // Label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(metric.label.toUpperCase(), x + 6, y + 10);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...metric.color);
        doc.text(metric.value, x + 6, y + 24);
    });

    y += cardHeight + 12;

    // ==================== SECTION 2: FINANCIAL ANALYSIS ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Pendapatan & Komponen Biaya', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 30, y + 4);
    y += 13;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Pos Keuangan', 'Nominal (IDR)', 'Alokasi Pendapatan']],
        body: [
            ['Pendapatan Kotor (Subtotal)', formatRupiah(data.totalSubtotal || data.totalRevenue), `${data.totalRevenue > 0 ? (((data.totalSubtotal || data.totalRevenue) / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Diskon', formatRupiah(data.totalDiscount || 0), `${data.totalRevenue > 0 ? (((data.totalDiscount || 0) / (data.totalSubtotal || data.totalRevenue)) * 100).toFixed(1) : '0.0'}%`],
            ['Total Retensi PPN (Tax)', formatRupiah(data.totalTax), `${data.totalRevenue > 0 ? ((data.totalTax / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Biaya Layanan Operasional', formatRupiah(data.totalService), `${data.totalRevenue > 0 ? ((data.totalService / data.totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            [
                { content: 'TOTAL PENDAPATAN NETT', styles: { fontStyle: 'bold', textColor: COLORS.primary } },
                { content: formatRupiah(data.totalRevenue), styles: { fontStyle: 'bold', textColor: COLORS.primary } },
                { content: '100.0%', styles: { fontStyle: 'bold', textColor: COLORS.primary } }
            ],
        ],
        columnStyles: {
            0: { cellWidth: contentWidth * 0.45 },
            1: { halign: 'right', cellWidth: contentWidth * 0.30 },
            2: { halign: 'right', cellWidth: contentWidth * 0.25 }
        },
    }));

    y = (doc as any).lastAutoTable.finalY + 12;

    // Insight box — left accent border
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    const insightText = `Berdasarkan ${data.totalTransactions} transaksi, rata-rata nilai per bon mencapai ${formatRupiah(data.avgTransactionValue)}. Ini menunjukkan ${data.avgTransactionValue > 50000 ? 'nilai transaksi yang solid' : 'potensi peningkatan nilai transaksi'}.`;
    const insightLines = doc.splitTextToSize(insightText, contentWidth - 12);
    const insightH = insightLines.length * 5.5 + 10;

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(2.5);
    doc.line(margin, y, margin, y + insightH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.primary);
    doc.text('Insight Keuangan:', margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    doc.text(insightLines, margin + 6, y + 14);

    y += insightH + 6;

    // Exec summary footer
    drawFooter(null);

    // ==================== PAGE 3: KPI SECTION ====================
    doc.addPage();
    y = 24;

    sectionHeader('Key Performance Indicators');

    const totalItemsSold = data.topSellingItems.reduce((acc, item) => acc + item.count, 0);
    const avgItemsPerTx = data.totalTransactions > 0 ? totalItemsSold / data.totalTransactions : 0;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Metrik Operasional', 'Nilai Capaian', 'Evaluasi']],
        body: [
            ['Volume Transaksi', `${data.totalTransactions.toLocaleString('id-ID')} Tx`, data.totalTransactions > 50 ? 'OPTIMAL' : 'AVERAGE'],
            ['Average Order Value (AOV)', formatRupiah(data.avgTransactionValue), data.avgTransactionValue > 30000 ? 'STABLE' : 'GROWTH POTENTIAL'],
            ['Inventory Turnover (Item)', `${totalItemsSold.toLocaleString('id-ID')} Units`, '-'],
            ['Average Items Per Basket', avgItemsPerTx.toFixed(1) + ' units', avgItemsPerTx > 2 ? 'EFFICIENT' : 'STANDARD'],
            ['Unit Economic Revenue', totalItemsSold > 0 ? formatRupiah(data.totalRevenue / totalItemsSold) : '-', '-'],
        ],
        columnStyles: {
            0: { cellWidth: contentWidth * 0.40, fontStyle: 'bold' },
            1: { halign: 'right', cellWidth: contentWidth * 0.35 },
            2: { halign: 'center', cellWidth: contentWidth * 0.25 }
        },
    }));

    const kpiBottom = (doc as any).lastAutoTable.finalY + 12;

    // Check if enough room for payment analysis section
    if (kpiBottom > pageHeight - 70) {
        doc.addPage();
        y = 24;
    } else {
        y = kpiBottom;
    }

    // ==================== SECTION 4: PAYMENT ANALYSIS ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Analisis Metode Pembayaran', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 30, y + 4);
    y += 13;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Kanal Pembayaran', 'Frekuensi', 'Volume (IDR)', 'Pangsa Pasar']],
        body: data.paymentBreakdown.map(p => [
            p.name,
            `${p.count}x`,
            formatRupiah(p.total),
            `${((p.total / data.totalRevenue) * 100).toFixed(1)}%`
        ]),
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
            fillColor: COLORS.lightBg,
            textColor: COLORS.primary,
            fontSize: 9
        },
    }));

    // ==================== PAGE 4: PRODUCT & CATEGORY ====================
    doc.addPage();
    y = 24;

    sectionHeader('Performa Portfolio Produk');

    // Top Products
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text('5.1. Produk Terlaris (Top 5)', margin, y);
    y += 9;

    autoTable(doc, atOptions({
        startY: y,
        head: [['No.', 'Nama Produk/Layanan', 'Qty', 'Revenue (IDR)', 'Porsi']],
        body: data.topSellingItems.map((item, index) => [
            `0${index + 1}`,
            item.name,
            `${item.count} Units`,
            formatRupiah(item.revenue),
            `${((item.revenue / data.totalRevenue) * 100).toFixed(1)}%`
        ]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
            0: { halign: 'center', cellWidth: contentWidth * 0.10, fontStyle: 'bold' },
            1: { cellWidth: contentWidth * 0.35 },
            2: { halign: 'center', cellWidth: contentWidth * 0.15 },
            3: { halign: 'right', cellWidth: contentWidth * 0.25 },
            4: { halign: 'right', cellWidth: contentWidth * 0.15 }
        },
    }));

    y = (doc as any).lastAutoTable.finalY + 12;

    // Check if enough room for category section, else add page
    if (y > pageHeight - 80) {
        doc.addPage();
        y = 24;
    }

    // Category Performance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text('5.2. Performa Berdasarkan Kategori', margin, y);
    y += 9;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Kategori Utama', 'Subtotal Revenue', 'Share']],
        body: data.categoryDistribution.map((cat, index) => [
            cat.name,
            formatRupiah(cat.value),
            `${((cat.value / data.totalRevenue) * 100).toFixed(1)}%`,
        ]),
        columnStyles: {
            0: { cellWidth: contentWidth * 0.28, fontStyle: 'bold' },
            1: { halign: 'right', cellWidth: contentWidth * 0.36 },
            2: { halign: 'right', cellWidth: contentWidth * 0.36 }
        },
        foot: [
            ['Total Portfolio', formatRupiah(data.totalRevenue), '100%']
        ],
        footStyles: {
            fontStyle: 'bold',
            fillColor: COLORS.lightBg,
            textColor: COLORS.primary,
            fontSize: 9
        },
    }));

    const catBottom = (doc as any).lastAutoTable.finalY + 14;

    // Check if enough room for daily trend section, else add page
    if (catBottom > pageHeight - 80) {
        doc.addPage();
        y = 24;
    } else {
        y = catBottom;
    }

    // ==================== SECTION 6: DAILY TREND ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Tren Pertumbuhan Harian', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 30, y + 4);
    y += 13;

    autoTable(doc, atOptions({
        startY: y,
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
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fontSize: 8.5, cellPadding: 3 },
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
            fillColor: COLORS.lightBg,
            textColor: COLORS.primary,
            fontSize: 9
        },
    }));

    // ==================== SIGNATURES & APPROVAL ====================
    let sigLineY = (doc as any).lastAutoTable.finalY + 24;
    const sigBoxWidth = 72;

    if (sigLineY > pageHeight - 55) {
        doc.addPage();
        sigLineY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Otorisasi & Persetujuan Keuangan', margin, sigLineY);

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, sigLineY + 4, margin + 30, sigLineY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text('Laporan ini validasikan secara finansial untuk kebutuhan audit internal.', margin, sigLineY + 14);

    const sigY2 = sigLineY + 22;

    // Prepared by
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Disiapkan Oleh:', margin, sigY2);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(margin, sigY2 + 22, margin + sigBoxWidth, sigY2 + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('( Bagian Keuangan )', margin + sigBoxWidth / 2, sigY2 + 28, { align: 'center' });
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, margin + sigBoxWidth / 2, sigY2 + 34, { align: 'center' });

    // Approved by
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Disetujui Oleh:', pageWidth - margin - sigBoxWidth, sigY2);
    doc.line(pageWidth - margin - sigBoxWidth, sigY2 + 22, pageWidth - margin, sigY2 + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('( Manager / Owner )', pageWidth - margin - sigBoxWidth / 2, sigY2 + 28, { align: 'center' });
    doc.text(`Tanggal: ________________`, pageWidth - margin - sigBoxWidth / 2, sigY2 + 34, { align: 'center' });

    // Signature footer
    drawFooter(null);

    // ==================== FOOTER ON MANUAL PAGES ====================
    // Cover already has footer. Exec summary already has footer. Signature has footer.
    // For safety, redraw footer on pages 1-2 with correct final page count
    for (let i = 1; i <= 2; i++) {
        doc.setPage(i);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${settings.name} — Laporan Kinerja Keuangan`, pageWidth / 2, pageHeight - 13, { align: 'center' });
        const pc = (doc as any).internal.getNumberOfPages();
        doc.text(`Hal ${i} / ${pc}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id }), margin, pageHeight - 8);
    }

    // Save PDF
    const filename = `Laporan_Keuangan_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(filename);
};
