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

type RGB = [number, number, number];

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const generateTransactionReport = async (options: ReportOptions) => {
    const { transactions, users, dateRange, settings, filters } = options;
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
        doc.text(`${settings.name} — Laporan Transaksi`, pageWidth / 2, pageHeight - 13, { align: 'center' });
        doc.text(`Hal ${count} / ${count}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    const atOptions = (overrides: Record<string, any> = {}): Record<string, any> => ({
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.lightBg, textColor: COLORS.primary, fontStyle: 'bold', fontSize: 9 },
        margin: { left: margin, right: margin, bottom: footerHeight + 4 },
        didDrawPage: drawFooter,
        ...overrides,
    });

    let y = 24;

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
    doc.text('LAPORAN TRANSAKSI', pageWidth / 2, titleY, { align: 'center' });

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(1.5);
    doc.line(pageWidth / 2 - 40, titleY + 5, pageWidth / 2 + 40, titleY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Periode: ${periodText}`, pageWidth / 2, titleY + 17, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Dibuat: ${format(new Date(), 'EEEE, dd MMMM yyyy, HH:mm', { locale: id })}`, pageWidth / 2, titleY + 26, { align: 'center' });
    doc.text(`${transactions.length} transaksi  |  ${totalItems} item terjual  |  ${formatRupiah(totalRevenue)}`, pageWidth / 2, titleY + 34, { align: 'center' });

    // TOC
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
        { num: '01', title: 'Ringkasan Eksekutif' },
        { num: '02', title: 'Analisis Keuangan' },
        { num: '03', title: 'Analisis Waktu & Trend' },
        { num: '04', title: 'Performa Staff Kasir' },
        { num: '05', title: 'Metode Pembayaran' },
        { num: '06', title: 'Data Transaksi Terperinci' },
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

    const filterDesc = [];
    if (filters.method !== 'Semua') filterDesc.push(`Metode: ${filters.method}`);
    if (filters.user !== 'Semua') {
        const userName = getUserName(filters.user);
        filterDesc.push(`Kasir: ${userName}`);
    }
    const filterText = filterDesc.length > 0 ? ` (Filter: ${filterDesc.join(', ')})` : '';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.secondary);
    const summaryText = `Laporan detail transaksi ${settings.name} periode ${periodText}${filterText}. Total ${transactions.length} transaksi tercatat dengan pendapatan kotor sebesar ${formatRupiah(totalRevenue)}. Dokumen ini menyajikan analisis mendalam per kasir, metode pembayaran, dan rincian lengkap setiap transaksi.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5.5 + 16;

    // Key Metrics cards
    const metrics = [
        { label: 'Total Pendapatan', value: formatRupiah(totalRevenue) },
        { label: 'Jumlah Transaksi', value: `${transactions.length.toLocaleString('id-ID')}` },
        { label: 'Rata-rata per Bon', value: formatRupiah(avgTransaction) },
    ];

    const cardW = (contentWidth - 12) / 3;
    const cardH = 32;

    metrics.forEach((metric, index) => {
        const cx = margin + index * (cardW + 6);
        doc.setFillColor(249, 250, 251);
        doc.rect(cx, y, cardW, cardH, 'F');
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.rect(cx, y, cardW, cardH, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(metric.label.toUpperCase(), cx + 6, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.primary);
        doc.text(metric.value, cx + 6, y + 24);
    });

    y += cardH + 12;

    // Exec summary footer
    drawFooter(null);

    // ==================== SECTION 2: FINANCIAL ANALYSIS ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Rangkuman Komponen Keuangan', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 30, y + 4);
    y += 13;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Komponen Keuangan', 'Nilai (IDR)', 'Portofolio']],
        body: [
            ['Total Subtotal Transaksi', formatRupiah(transactions.reduce((s, t) => s + (t.subtotal || 0), 0)), '100%'],
            ['Total PPN (Tax)', formatRupiah(totalTax), `${totalRevenue > 0 ? ((totalTax / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            ['Total Biaya Layanan', formatRupiah(totalService), `${totalRevenue > 0 ? ((totalService / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
            [
                { content: 'TOTAL PENDAPATAN BERSIH', styles: { fontStyle: 'bold', textColor: COLORS.primary } },
                { content: formatRupiah(totalRevenue), styles: { fontStyle: 'bold', textColor: COLORS.primary } },
                { content: '100.0%', styles: { fontStyle: 'bold', textColor: COLORS.primary } }
            ],
        ],
        columnStyles: {
            0: { cellWidth: contentWidth * 0.44 },
            1: { halign: 'right', cellWidth: contentWidth * 0.30 },
            2: { halign: 'right', cellWidth: contentWidth * 0.26 }
        },
    }));

    y = (doc as any).lastAutoTable.finalY + 14;

    // Insight box — simple left accent border line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    const statsText = `Daftar ini mencakup ${totalItems} unit item terjual dengan rata-rata ${transactions.length > 0 ? (totalItems / transactions.length).toFixed(1) : '0'} item/transaksi. Transaksi puncak tercatat pada nilai ${transactions.length > 0 ? formatRupiah(Math.max(...transactions.map(t => t.totalAmount || 0))) : '-'}.`;
    const statsLines = doc.splitTextToSize(statsText, contentWidth - 12);
    const insightH = statsLines.length * 5.5 + 10;

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(2.5);
    doc.line(margin, y, margin, y + insightH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.primary);
    doc.text('Statistik Operasional:', margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    doc.text(statsLines, margin + 6, y + 14);

    y += insightH + 6;

    // ==================== PAGE 3: OPERATIONAL ANALYSIS ====================
    doc.addPage();
    y = 24;

    sectionHeader('Analisis Waktu & Tren');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.secondary);
    doc.text('Distribusi Penjualan per Jam', margin, y);
    y += 6;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Jam Operasional', 'Total Omzet (IDR)', 'Kontribusi (%)']],
        body: hourlyDistribution.map(h => [
            `${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour + 1).padStart(2, '0')}:00`,
            formatRupiah(h.total),
            `${((h.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        columnStyles: {
            0: { cellWidth: contentWidth * 0.40 },
            1: { halign: 'right', cellWidth: contentWidth * 0.36 },
            2: { halign: 'right', cellWidth: contentWidth * 0.24 }
        },
    }));

    y = (doc as any).lastAutoTable.finalY + 15;

    // Room check for cashier section
    if (y > pageHeight - 80) {
        doc.addPage();
        y = 24;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Performa Staff Kasir', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 22, y + 4);
    y += 13;

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

    autoTable(doc, atOptions({
        startY: y,
        head: [['Staff Kasir', 'Vol. Transaksi', 'Omzet Bruto', 'Rerata Bon', 'Porsi']],
        body: cashierPerformance.map(c => [
            c.name,
            `${c.count}x`,
            formatRupiah(c.total),
            formatRupiah(c.total / c.count),
            `${((c.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: contentWidth * 0.24 },
            1: { halign: 'center', cellWidth: contentWidth * 0.19 },
            2: { halign: 'right', cellWidth: contentWidth * 0.19 },
            3: { halign: 'right', cellWidth: contentWidth * 0.19 },
            4: { halign: 'right', cellWidth: contentWidth * 0.19 }
        },
        foot: [
            ['Total Keseluruhan', `${transactions.length}x`, formatRupiah(totalRevenue), formatRupiah(avgTransaction), '100%']
        ],
        footStyles: { fontStyle: 'bold', fillColor: COLORS.lightBg, textColor: COLORS.primary, fontSize: 9 },
    }));

    y = (doc as any).lastAutoTable.finalY + 15;

    // Room check for payment methods section
    if (y > pageHeight - 70) {
        doc.addPage();
        y = 24;
    }

    // ==================== SECTION 5: PAYMENT METHODS ====================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Distribusi Metode Pembayaran', margin, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 4, margin + 30, y + 4);
    y += 13;

    autoTable(doc, atOptions({
        startY: y,
        head: [['Metode Pembayaran', 'Frekuensi', 'Volume Penjualan', 'Pangsa Pasar']],
        body: paymentBreakdown.map(p => [
            p.name,
            `${p.count}x`,
            formatRupiah(p.total),
            `${((p.total / totalRevenue) * 100).toFixed(1)}%`
        ]),
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: contentWidth * 0.34 },
            1: { halign: 'center', cellWidth: contentWidth * 0.20 },
            2: { halign: 'right', cellWidth: contentWidth * 0.25 },
            3: { halign: 'right', cellWidth: contentWidth * 0.21 }
        },
        foot: [
            ['Total Pembayaran', `${transactions.length}x`, formatRupiah(totalRevenue), '100%']
        ],
        footStyles: { fontStyle: 'bold', fillColor: COLORS.lightBg, textColor: COLORS.primary, fontSize: 9 },
    }));

    // ==================== PAGE 4+: DETAILED TRANSACTIONS ====================
    doc.addPage();
    y = 24;

    sectionHeader('Jurnal Transaksi Terperinci');

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

    autoTable(doc, atOptions({
        startY: y,
        head: [['No', 'Waktu', 'Kasir', 'Item Vendor', 'Bruto', 'Tax', 'Svc', 'Nett', 'Metode']],
        body: detailedRows,
        styles: { fontSize: 6.5, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.lightBg, textColor: COLORS.primary, fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { halign: 'center', cellWidth: contentWidth * 0.05 },
            1: { cellWidth: contentWidth * 0.10 },
            2: { cellWidth: contentWidth * 0.12 },
            3: { cellWidth: contentWidth * 0.22 },
            4: { halign: 'right', cellWidth: contentWidth * 0.11 },
            5: { halign: 'right', cellWidth: contentWidth * 0.08 },
            6: { halign: 'right', cellWidth: contentWidth * 0.08 },
            7: { halign: 'right', cellWidth: contentWidth * 0.11, fontStyle: 'bold' },
            8: { cellWidth: contentWidth * 0.13 }
        },
    }));

    // Add totals summary after the table
    y = (doc as any).lastAutoTable.finalY + 10;

    // Room check for summary table
    if (y > pageHeight - 50) {
        doc.addPage();
        y = 24;
    }

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Konsolidasi:', margin, y);

    const summaryData = [
        ['Total Subtotal (Bruto)', formatRupiah(transactions.reduce((s, t) => s + (t.subtotal || 0), 0))],
        ['Total PPN 11% (Tax)', formatRupiah(totalTax)],
        ['Total Service Charge', formatRupiah(totalService)],
        ['TOTAL AKHIR (Nett)', formatRupiah(totalRevenue)]
    ];

    autoTable(doc, atOptions({
        startY: y + 4,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2, fontStyle: 'bold', lineColor: COLORS.border, lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.69 },
            1: { halign: 'right', cellWidth: contentWidth * 0.31 }
        },
    }));

    // ==================== SIGNATURES ====================
    const sigBoxW = 72;
    const detailEnd = (doc as any).lastAutoTable.finalY;
    const pageNum = (doc as any).internal.getNumberOfPages();

    doc.setPage(pageNum);
    let sigY = detailEnd + 24;

    if (sigY > pageHeight - 55) {
        doc.addPage();
        sigY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('Otorisasi & Persetujuan', margin, sigY);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.line(margin, sigY + 4, margin + 26, sigY + 4);
    sigY += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Disiapkan Oleh:', margin, sigY);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(margin, sigY + 22, margin + sigBoxW, sigY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('( Bagian Keuangan )', margin + sigBoxW / 2, sigY + 28, { align: 'center' });
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, margin + sigBoxW / 2, sigY + 34, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Disetujui Oleh:', pageWidth - margin - sigBoxW, sigY);
    doc.line(pageWidth - margin - sigBoxW, sigY + 22, pageWidth - margin, sigY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('( Manager / Owner )', pageWidth - margin - sigBoxW / 2, sigY + 28, { align: 'center' });
    doc.text('Tanggal: ________________', pageWidth - margin - sigBoxW / 2, sigY + 34, { align: 'center' });

    // Signature footer
    drawFooter(null);

    // ==================== FOOTER ON MANUAL PAGES ====================
    // Pages 1-2 (cover, exec summary) don't have autoTable didDrawPage footer
    // Page 3+ have autoTable footers via didDrawPage
    // Cover already has footer. Exec summary already has footer.
    // For safety, redraw footer on pages 1-2 only
    for (let i = 1; i <= 2; i++) {
        doc.setPage(i);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${settings.name} — Laporan Transaksi`, pageWidth / 2, pageHeight - 13, { align: 'center' });
        const pc = (doc as any).internal.getNumberOfPages();
        doc.text(`Hal ${i} / ${pc}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // Save PDF
    const filename = `Laporan_Transaksi_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(filename);
};
