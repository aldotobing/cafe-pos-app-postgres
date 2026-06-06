import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../format';
import { CafeSettings } from '@/types';

interface ProfitItem {
  menuName: string;
  category: string;
  hppPrice: number;
  sellingPrice: number;
  totalQtySold: number;
  totalRevenue: number;
  totalCOGS: number;
  totalProfit: number;
  profitMargin: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalCOGS: number;
  totalProfit: number;
  avgMargin: number;
  grandTotal: number;
  totalItems: number;
}

interface ProfitReportOptions {
  profitData: ProfitItem[];
  summary: ProfitSummary;
  dateRange: { from: Date; to: Date };
  settings: CafeSettings;
  itemCount: number;
}

type RGB = [number, number, number];

export const generateProfitReport = async (options: ProfitReportOptions) => {
  const { profitData, summary, dateRange, settings, itemCount } = options;
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const colors: Record<string, RGB> = {
    primary: [26, 32, 44],
    primaryLight: [44, 62, 80],
    accent: [212, 175, 55],
    success: [34, 139, 34],
    warning: [217, 119, 6],
    danger: [185, 28, 28],
    muted: [113, 128, 150],
    bgLight: [248, 250, 252],
    border: [226, 232, 240],
    textPrimary: [26, 32, 44],
    textSecondary: [100, 116, 139],
  };

  const periodText = `${format(dateRange.from, 'dd MMMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMMM yyyy', { locale: id })}`;

  const sortedByProfit = [...profitData].sort((a, b) => b.totalProfit - a.totalProfit);
  const sortedByMargin = [...profitData].sort((a, b) => b.profitMargin - a.profitMargin);

  const highMarginCount = profitData.filter(p => p.profitMargin >= 50).length;
  const midMarginCount = profitData.filter(p => p.profitMargin >= 30 && p.profitMargin < 50).length;
  const lowMarginCount = profitData.filter(p => p.profitMargin < 30).length;

  const categoryMap: Record<string, { revenue: number; cogs: number; profit: number; items: number }> = {};
  profitData.forEach(p => {
    if (!categoryMap[p.category]) {
      categoryMap[p.category] = { revenue: 0, cogs: 0, profit: 0, items: 0 };
    }
    categoryMap[p.category].revenue += p.totalRevenue;
    categoryMap[p.category].cogs += p.totalCOGS;
    categoryMap[p.category].profit += p.totalProfit;
    categoryMap[p.category].items += 1;
  });
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([name, data]) => ({ name, ...data, margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);

  // ==================== COVER PAGE ====================
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, 8, 297, 'F');

  doc.setFillColor(252, 252, 253);
  doc.rect(8, 0, pageWidth - 8, 95, 'F');

  doc.setFillColor(...colors.accent);
  doc.rect(25, 30, 2, 45, 'F');

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
  doc.text('LAPORAN ANALISIS LABA RUGI', 32, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.textSecondary);
  doc.text(`Periode Fiskal: ${periodText}`, 32, 72);
  doc.setFontSize(8);
  doc.text(`Generated on: ${format(new Date(), "EEEE, dd MMMM yyyy, HH:mm", { locale: id })}`, 32, 79);
  doc.text(`${itemCount} item dianalisis dari ${summary.totalItems} produk aktif`, 32, 85);

  // ==================== TABLE OF CONTENTS ====================
  let yPosition = 120;
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
    { num: 'I', title: 'Ringkasan Eksekutif', page: '02' },
    { num: 'II', title: 'Indikator Profitabilitas', page: '03' },
    { num: 'III', title: 'Distribusi Margin Laba', page: '03' },
    { num: 'IV', title: 'Performa Kategori', page: '04' },
    { num: 'V', title: 'Item Paling Menguntungkan', page: '05' },
    { num: 'VI', title: 'Analisis Struktur Biaya', page: '06' },
    { num: 'VII', title: 'Detail Laba Rugi per Item', page: '07' },
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
  const summaryText = `Laporan ini menyajikan analisis laba rugi komprehensif untuk ${settings.name} selama periode ${periodText}. Analisis mencakup ${itemCount} item yang terjual dari ${summary.totalItems} produk aktif, dengan fokus pada profitabilitas per item, distribusi margin, struktur biaya (HPP), dan performa berdasarkan kategori produk.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
  doc.text(summaryLines, margin, yPosition);
  yPosition += summaryLines.length * 5 + 10;

  // Key Financial Metrics Cards
  const metrics = [
    { label: 'Pendapatan Bruto', value: formatRupiah(summary.grandTotal), color: colors.primary },
    { label: 'Total HPP', value: formatRupiah(summary.totalCOGS), color: colors.warning },
    { label: 'Laba Kotor', value: formatRupiah(summary.totalProfit), color: summary.totalProfit >= 0 ? colors.success : colors.danger },
  ];

  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 32;
  const cardGap = 5;

  metrics.forEach((metric, index) => {
    const x = margin + (index * (cardWidth + cardGap));
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(235, 238, 241);
    doc.setLineWidth(0.1);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textSecondary);
    doc.text(metric.label.toUpperCase(), x + 5, yPosition + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, x + 5, yPosition + 19);
    doc.setFillColor(...colors.accent);
    doc.rect(x + 5, yPosition + 23, 10, 0.5, 'F');
  });

  yPosition += cardHeight + 10;

  const marginColor = summary.avgMargin >= 50 ? colors.success : summary.avgMargin >= 30 ? colors.warning : colors.danger;
  const marginMetrics = [
    { label: 'Margin Rata-rata', value: `${summary.avgMargin.toFixed(1)}%`, color: marginColor },
    { label: 'Item Dianalisis', value: `${itemCount}`, color: colors.primary },
    { label: 'Produk Aktif', value: `${summary.totalItems}`, color: colors.primaryLight },
  ];

  metrics.forEach((_) => { /* reuse layout */ });
  marginMetrics.forEach((metric, index) => {
    const x = margin + (index * (cardWidth + cardGap));
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(235, 238, 241);
    doc.setLineWidth(0.1);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textSecondary);
    doc.text(metric.label.toUpperCase(), x + 5, yPosition + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, x + 5, yPosition + 19);
    doc.setFillColor(...colors.accent);
    doc.rect(x + 5, yPosition + 23, 10, 0.5, 'F');
  });

  yPosition += cardHeight + 20;

  // Profitability insight box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, yPosition, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(...colors.success);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, contentWidth, 22, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colors.success);
  doc.text('Insight Profitabilitas:', margin + 4, yPosition + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const profitInsight = `Total laba kotor mencapai ${formatRupiah(summary.totalProfit)} dengan margin rata-rata ${summary.avgMargin.toFixed(1)}%. Dari ${itemCount} item, ${highMarginCount} item memiliki margin tinggi (≥50%), ${midMarginCount} item margin menengah, dan ${lowMarginCount} item margin rendah (<30%).`;
  const profitInsightLines = doc.splitTextToSize(profitInsight, contentWidth - 15);
  doc.text(profitInsightLines, margin + 4, yPosition + 13);

  // ==================== PAGE 3: KPIs & MARGIN DISTRIBUTION ====================
  doc.addPage();
  yPosition = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.primary);
  doc.text('Indikator Profitabilitas', margin, yPosition);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
  yPosition += 12;

  const roi = summary.totalCOGS > 0 ? (summary.totalProfit / summary.totalCOGS) * 100 : 0;
  const markupAvg = profitData.length > 0
    ? profitData.filter(p => p.hppPrice > 0).reduce((sum, p) => sum + ((p.sellingPrice - p.hppPrice) / p.hppPrice * 100), 0) / profitData.filter(p => p.hppPrice > 0).length
    : 0;

  autoTable(doc, {
    startY: yPosition,
    head: [['Indikator Utama', 'Nilai', 'Evaluasi']],
    body: [
      ['Gross Profit Margin', `${summary.avgMargin.toFixed(1)}%`, summary.avgMargin >= 50 ? 'SEHAT' : summary.avgMargin >= 30 ? 'CUKUP' : 'PERLU REVIEW'],
      ['Return on COGS (ROI)', `${roi.toFixed(1)}%`, roi >= 100 ? 'SANGAT BAIK' : roi >= 50 ? 'BAIK' : 'RENDAH'],
      ['Rata-rata Markup', `${markupAvg.toFixed(1)}%`, markupAvg >= 50 ? 'OPTIMAL' : 'POTENSI NAIK'],
      ['Rasio Biaya-Pendapatan', `${summary.totalRevenue > 0 ? (summary.totalCOGS / summary.totalRevenue * 100).toFixed(1) : '0.0'}%`, summary.totalCOGS / summary.totalRevenue < 0.5 ? 'EFISIEN' : 'HIGH COST'],
      ['Items Margin Tinggi (≥50%)', `${highMarginCount} dari ${itemCount}`, highMarginCount > itemCount * 0.4 ? 'PORTFOLIO KUAT' : 'DIVERSIFIKASI'],
      ['Nilai Laba per Item', profitData.length > 0 ? formatRupiah(summary.totalProfit / itemCount) : '-', '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.44, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: contentWidth * 0.28 },
      2: { halign: 'center', cellWidth: contentWidth * 0.28 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...colors.primary);
  doc.text('Distribusi Margin Laba', margin, yPosition);
  yPosition += 8;

  const marginDist = [
    ['Margin Tinggi (≥50%)', `${highMarginCount} item`, `${((highMarginCount / itemCount) * 100).toFixed(1)}%`, 'SEHAT'],
    ['Margin Menengah (30-49%)', `${midMarginCount} item`, `${((midMarginCount / itemCount) * 100).toFixed(1)}%`, 'STABIL'],
    ['Margin Rendah (<30%)', `${lowMarginCount} item`, `${((lowMarginCount / itemCount) * 100).toFixed(1)}%`, lowMarginCount > itemCount * 0.5 ? 'PERHATIAN' : 'WAJAR'],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Kategori Margin', 'Jumlah Item', 'Proporsi', 'Status']],
    body: marginDist,
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.35, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: contentWidth * 0.22 },
      2: { halign: 'right', cellWidth: contentWidth * 0.21 },
      3: { halign: 'center', cellWidth: contentWidth * 0.22 },
    },
    foot: [['TOTAL', `${itemCount} item`, '100%', '-']],
    footStyles: { fontStyle: 'bold', fillColor: colors.bgLight, textColor: colors.primary, fontSize: 9 },
  });

  // ==================== PAGE 4: CATEGORY PERFORMANCE ====================
  doc.addPage();
  yPosition = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.primary);
  doc.text('Performa Profitabilitas Kategori', margin, yPosition);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
  yPosition += 12;

  autoTable(doc, {
    startY: yPosition,
    head: [['Kategori', 'Item', 'Pendapatan', 'HPP', 'Laba', 'Margin']],
    body: categoryBreakdown.map(c => [
      c.name,
      `${c.items} item`,
      formatRupiah(c.revenue),
      formatRupiah(c.cogs),
      formatRupiah(c.profit),
      `${c.margin.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.22, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: contentWidth * 0.12 },
      2: { halign: 'right', cellWidth: contentWidth * 0.18 },
      3: { halign: 'right', cellWidth: contentWidth * 0.18 },
      4: { halign: 'right', cellWidth: contentWidth * 0.16 },
      5: { halign: 'right', cellWidth: contentWidth * 0.14 },
    },
    foot: [
      [`${categoryBreakdown.length} Kategori`, `${itemCount} item`, formatRupiah(summary.totalRevenue), formatRupiah(summary.totalCOGS), formatRupiah(summary.totalProfit), `${summary.avgMargin.toFixed(1)}%`],
    ],
    footStyles: { fontStyle: 'bold', fillColor: colors.bgLight, textColor: colors.primary, fontSize: 9 },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;
  const topCategory = categoryBreakdown[0];
  if (topCategory) {
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, yPosition, contentWidth, 18, 2, 2, 'F');
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPosition, 1, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.primary);
    doc.text('Kategori Terkuat:', margin + 4, yPosition + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    doc.text(`${topCategory.name} — Laba ${formatRupiah(topCategory.profit)} (${topCategory.margin.toFixed(1)}% margin) dari ${topCategory.items} item`, margin + 4, yPosition + 13);
  }

  // ==================== PAGE 5: TOP ITEMS BY PROFIT ====================
  doc.addPage();
  yPosition = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.primary);
  doc.text('Item Paling Menguntungkan', margin, yPosition);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
  yPosition += 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colors.primaryLight);
  doc.text('Top 10 Berdasarkan Total Laba', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['No', 'Item', 'Kategori', 'Terjual', 'Harga', 'HPP', 'Laba', 'Margin']],
    body: sortedByProfit.slice(0, 10).map((p, i) => [
      `${i + 1}`,
      p.menuName,
      p.category,
      `${p.totalQtySold}x`,
      formatRupiah(p.sellingPrice),
      formatRupiah(p.hppPrice),
      formatRupiah(p.totalProfit),
      `${p.profitMargin.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentWidth * 0.06, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.20 },
      2: { cellWidth: contentWidth * 0.14 },
      3: { halign: 'center', cellWidth: contentWidth * 0.10 },
      4: { halign: 'right', cellWidth: contentWidth * 0.14 },
      5: { halign: 'right', cellWidth: contentWidth * 0.13 },
      6: { halign: 'right', cellWidth: contentWidth * 0.13 },
      7: { halign: 'right', cellWidth: contentWidth * 0.10 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colors.primaryLight);
  doc.text('Top 10 Margin Tertinggi', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['No', 'Item', 'Kategori', 'Harga', 'HPP', 'Markup', 'Margin', 'Laba']],
    body: sortedByMargin.slice(0, 10).map((p, i) => {
      const markup = p.hppPrice > 0 ? ((p.sellingPrice - p.hppPrice) / p.hppPrice) * 100 : 0;
      return [
        `${i + 1}`,
        p.menuName,
        p.category,
        formatRupiah(p.sellingPrice),
        formatRupiah(p.hppPrice),
        `${markup.toFixed(0)}%`,
        `${p.profitMargin.toFixed(1)}%`,
        formatRupiah(p.totalProfit),
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentWidth * 0.06, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.20 },
      2: { cellWidth: contentWidth * 0.13 },
      3: { halign: 'right', cellWidth: contentWidth * 0.12 },
      4: { halign: 'right', cellWidth: contentWidth * 0.12 },
      5: { halign: 'right', cellWidth: contentWidth * 0.10 },
      6: { halign: 'right', cellWidth: contentWidth * 0.12 },
      7: { halign: 'right', cellWidth: contentWidth * 0.15 },
    },
  });

  // ==================== PAGE 6: COST STRUCTURE ANALYSIS ====================
  doc.addPage();
  yPosition = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.primary);
  doc.text('Analisis Struktur Biaya', margin, yPosition);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
  yPosition += 12;

  const costRatio = summary.totalRevenue > 0 ? (summary.totalCOGS / summary.grandTotal) * 100 : 0;
  const profitRatio = summary.grandTotal > 0 ? (summary.totalProfit / summary.grandTotal) * 100 : 0;

  autoTable(doc, {
    startY: yPosition,
    head: [['Komponen Biaya', 'Nominal (IDR)', 'Proporsi dari Omzet']],
    body: [
      ['Omzet Bruto', formatRupiah(summary.grandTotal), '100.0%'],
      ['Harga Pokok Penjualan (HPP)', formatRupiah(summary.totalCOGS), `${costRatio.toFixed(1)}%`],
      [
        { content: 'LABA KOTOR', styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? colors.success : colors.danger } },
        { content: formatRupiah(summary.totalProfit), styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? colors.success : colors.danger } },
        { content: `${profitRatio.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? colors.success : colors.danger } },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9.5, cellPadding: 4 },
    styles: { fontSize: 9, cellPadding: 3.5, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.50 },
      1: { halign: 'right', cellWidth: contentWidth * 0.25 },
      2: { halign: 'right', cellWidth: contentWidth * 0.25 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Cost distribution by category
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colors.primaryLight);
  doc.text('Kontribusi Laba per Kategori', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Kategori', 'Laba', 'Kontribusi Laba', 'Margin']],
    body: categoryBreakdown.map(c => [
      c.name,
      formatRupiah(c.profit),
      `${summary.totalProfit > 0 ? ((c.profit / summary.totalProfit) * 100).toFixed(1) : '0.0'}%`,
      `${c.margin.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.28, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: contentWidth * 0.26 },
      2: { halign: 'right', cellWidth: contentWidth * 0.24 },
      3: { halign: 'right', cellWidth: contentWidth * 0.22 },
    },
  });

  // ==================== PAGE 7+: FULL ITEM DETAIL ====================
  doc.addPage();
  yPosition = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colors.primary);
  doc.text('Detail Laba Rugi per Item', margin, yPosition);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition + 3, margin + 15, yPosition + 3);
  yPosition += 15;

  autoTable(doc, {
    startY: yPosition,
    head: [['No', 'Item', 'Kategori', 'Qty', 'Harga', 'HPP', 'Pendapatan', 'HPP Total', 'Laba', 'Margin']],
    body: profitData.map((p, i) => [
      `${i + 1}`,
      p.menuName,
      p.category,
      `${p.totalQtySold}x`,
      formatRupiah(p.sellingPrice),
      formatRupiah(p.hppPrice),
      formatRupiah(p.totalRevenue),
      formatRupiah(p.totalCOGS),
      formatRupiah(p.totalProfit),
      `${p.profitMargin.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: colors.bgLight, textColor: colors.primary, fontStyle: 'bold', fontSize: 7, cellPadding: 2.5 },
    styles: { fontSize: 6.5, cellPadding: 2, lineColor: colors.border, lineWidth: 0.1 },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentWidth * 0.04, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.16 },
      2: { cellWidth: contentWidth * 0.11 },
      3: { halign: 'center', cellWidth: contentWidth * 0.06 },
      4: { halign: 'right', cellWidth: contentWidth * 0.10 },
      5: { halign: 'right', cellWidth: contentWidth * 0.09 },
      6: { halign: 'right', cellWidth: contentWidth * 0.11 },
      7: { halign: 'right', cellWidth: contentWidth * 0.10 },
      8: { halign: 'right', cellWidth: contentWidth * 0.11 },
      9: { halign: 'right', cellWidth: contentWidth * 0.10 },
    },
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
  doc.text('Laporan laba rugi ini telah diverifikasi dan disetujui.', margin, sigY + 12);

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
    doc.text(`${settings.name} — Laporan Analisis Laba Rugi | Kasirku.biz.id`, pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, doc.internal.pageSize.height - 10, { align: 'right' });
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id }), margin, doc.internal.pageSize.height - 10);
  }

  const filename = `Laporan_LabaRugi_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(filename);
};
