import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../format';
import { CafeSettings } from '@/types';
import { loadImageAsBase64 } from './image-utils';

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
  const doc = new jsPDF('p');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
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
    doc.text(`${settings.name} — Laporan Analisis Laba Rugi`, pageWidth / 2, pageHeight - 13, { align: 'center' });
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

  const periodText = `${format(dateRange.from, 'dd MMMM yyyy', { locale: id })} — ${format(dateRange.to, 'dd MMMM yyyy', { locale: id })}`;

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
  doc.text('LAPORAN ANALISIS LABA RUGI', pageWidth / 2, titleY, { align: 'center' });

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
  doc.text(`${itemCount} item dianalisis  |  ${summary.totalItems} produk aktif`, pageWidth / 2, titleY + 34, { align: 'center' });

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
    { num: 'I', title: 'Ringkasan Eksekutif' },
    { num: 'II', title: 'Indikator Profitabilitas & Distribusi Margin' },
    { num: 'III', title: 'Performa Kategori' },
    { num: 'IV', title: 'Item Paling Menguntungkan' },
    { num: 'V', title: 'Analisis Struktur Biaya' },
    { num: 'VI', title: 'Detail Laba Rugi per Item' },
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

  const summaryText = `Laporan ini menyajikan analisis laba rugi untuk ${settings.name} selama periode ${periodText}. Analisis mencakup ${itemCount} item yang terjual dari ${summary.totalItems} produk aktif, dengan fokus pada profitabilitas per item, distribusi margin, struktur biaya (HPP), dan performa berdasarkan kategori produk.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.secondary);
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5.5 + 16;

  // Key Metrics cards
  const metrics = [
    { label: 'Pendapatan Bruto', value: formatRupiah(summary.grandTotal), color: COLORS.primary },
    { label: 'Total HPP', value: formatRupiah(summary.totalCOGS), color: COLORS.warning },
    { label: 'Laba Kotor', value: formatRupiah(summary.totalProfit), color: summary.totalProfit >= 0 ? COLORS.success : COLORS.danger },
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
    doc.text(metric.label, cx + 6, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, cx + 6, y + 24);
  });

  y += cardH + 12;

  const marginColor = summary.avgMargin >= 50 ? COLORS.success : summary.avgMargin >= 30 ? COLORS.warning : COLORS.danger;
  const marginMetrics = [
    { label: 'Margin Rata-rata', value: `${summary.avgMargin.toFixed(1)}%`, color: marginColor },
    { label: 'Item Dianalisis', value: `${itemCount}`, color: COLORS.primary },
    { label: 'Produk Aktif', value: `${summary.totalItems}`, color: COLORS.secondary },
  ];

  marginMetrics.forEach((metric, index) => {
    const cx = margin + index * (cardW + 6);
    doc.setFillColor(249, 250, 251);
    doc.rect(cx, y, cardW, cardH, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(cx, y, cardW, cardH, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(metric.label, cx + 6, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...metric.color);
    doc.text(metric.value, cx + 6, y + 24);
  });

  y += cardH + 16;

  // Insight paragraph — border height matches text height
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  const profitInsight = `Total laba kotor mencapai ${formatRupiah(summary.totalProfit)} dengan margin rata-rata ${summary.avgMargin.toFixed(1)}%. Dari ${itemCount} item, ${highMarginCount} item memiliki margin tinggi (≥50%), ${midMarginCount} item margin menengah, dan ${lowMarginCount} item margin rendah (<30%).`;
  const profitInsightLines = doc.splitTextToSize(profitInsight, contentWidth - 12);
  const insightH = profitInsightLines.length * 5.5 + 10;

  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin, y + insightH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.primary);
  doc.text('Insight', margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  doc.text(profitInsightLines, margin + 6, y + 14);

  y += insightH + 6;

  // Exec summary footer
  drawFooter(null);

  // ==================== PAGE 3: KPIs & MARGIN DISTRIBUTION ====================
  doc.addPage();
  y = 24;

  sectionHeader('Indikator Profitabilitas', 'Rasio & metrik keuangan utama');

  const roi = summary.totalCOGS > 0 ? (summary.totalProfit / summary.totalCOGS) * 100 : 0;
  const markupAvg = profitData.length > 0
    ? profitData.filter(p => p.hppPrice > 0).reduce((sum, p) => sum + ((p.sellingPrice - p.hppPrice) / p.hppPrice * 100), 0) / profitData.filter(p => p.hppPrice > 0).length
    : 0;

  autoTable(doc, atOptions({
    startY: y,
    head: [['Indikator', 'Nilai', 'Evaluasi']],
    body: [
      ['Gross Profit Margin', `${summary.avgMargin.toFixed(1)}%`, summary.avgMargin >= 50 ? 'SEHAT' : summary.avgMargin >= 30 ? 'CUKUP' : 'PERLU REVIEW'],
      ['Return on COGS (ROI)', `${roi.toFixed(1)}%`, roi >= 100 ? 'SANGAT BAIK' : roi >= 50 ? 'BAIK' : 'RENDAH'],
      ['Rata-rata Markup', `${markupAvg.toFixed(1)}%`, markupAvg >= 50 ? 'OPTIMAL' : 'POTENSI NAIK'],
      ['Rasio Biaya-Pendapatan', `${summary.totalRevenue > 0 ? (summary.totalCOGS / summary.totalRevenue * 100).toFixed(1) : '0.0'}%`, summary.totalCOGS / summary.totalRevenue < 0.5 ? 'EFISIEN' : 'HIGH COST'],
      ['Items Margin Tinggi (≥50%)', `${highMarginCount} dari ${itemCount}`, highMarginCount > itemCount * 0.4 ? 'PORTFOLIO KUAT' : 'DIVERSIFIKASI'],
      ['Nilai Laba per Item', profitData.length > 0 ? formatRupiah(summary.totalProfit / itemCount) : '-', '-'],
    ],
    columnStyles: {
      0: { cellWidth: contentWidth * 0.46, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: contentWidth * 0.26 },
      2: { halign: 'center', cellWidth: contentWidth * 0.28 },
    },
  }));

  const kpiBottom = (doc as any).lastAutoTable.finalY + 14;

  // Check if enough room for margin distribution section, else add page
  if (kpiBottom > pageHeight - 80) {
    doc.addPage();
    y = 24;
  } else {
    y = kpiBottom;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text('Distribusi Margin Laba', margin, y);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 4, margin + 24, y + 4);
  y += 13;

  const marginDist = [
    ['Margin Tinggi (≥50%)', `${highMarginCount} item`, `${((highMarginCount / itemCount) * 100).toFixed(1)}%`, 'SEHAT'],
    ['Margin Menengah (30-49%)', `${midMarginCount} item`, `${((midMarginCount / itemCount) * 100).toFixed(1)}%`, 'STABIL'],
    ['Margin Rendah (<30%)', `${lowMarginCount} item`, `${((lowMarginCount / itemCount) * 100).toFixed(1)}%`, lowMarginCount > itemCount * 0.5 ? 'PERHATIAN' : 'WAJAR'],
  ];

  autoTable(doc, atOptions({
    startY: y,
    head: [['Kategori Margin', 'Jumlah Item', 'Proporsi', 'Status']],
    body: marginDist,
    columnStyles: {
      0: { cellWidth: contentWidth * 0.36, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: contentWidth * 0.22 },
      2: { halign: 'right', cellWidth: contentWidth * 0.20 },
      3: { halign: 'center', cellWidth: contentWidth * 0.22 },
    },
    foot: [['TOTAL', `${itemCount} item`, '100%', '-']],
    footStyles: { fontStyle: 'bold', fillColor: COLORS.lightBg, textColor: COLORS.primary, fontSize: 9 },
  }));

  // KPI page footer handled by didDrawPage

  // ==================== PAGE 4: CATEGORY PERFORMANCE ====================
  doc.addPage();
  y = 24;
  sectionHeader('Performa Profitabilitas Kategori', 'Kontribusi laba per kategori produk');

  autoTable(doc, atOptions({
    startY: y,
    head: [['Kategori', 'Item', 'Pendapatan', 'HPP', 'Laba', 'Margin']],
    body: categoryBreakdown.map(c => [
      c.name,
      `${c.items} item`,
      formatRupiah(c.revenue),
      formatRupiah(c.cogs),
      formatRupiah(c.profit),
      `${c.margin.toFixed(1)}%`,
    ]),
    columnStyles: {
      0: { cellWidth: contentWidth * 0.22, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: contentWidth * 0.13 },
      2: { halign: 'right', cellWidth: contentWidth * 0.18 },
      3: { halign: 'right', cellWidth: contentWidth * 0.18 },
      4: { halign: 'right', cellWidth: contentWidth * 0.16 },
      5: { halign: 'right', cellWidth: contentWidth * 0.13 },
    },
    foot: [[`${categoryBreakdown.length} Kategori`, `${itemCount} item`, formatRupiah(summary.totalRevenue), formatRupiah(summary.totalCOGS), formatRupiah(summary.totalProfit), `${summary.avgMargin.toFixed(1)}%`]],
    footStyles: { fontStyle: 'bold', fillColor: COLORS.lightBg, textColor: COLORS.primary, fontSize: 9 },
  }));

  const catBottom = (doc as any).lastAutoTable.finalY + 10;
  const topCategory = categoryBreakdown[0];
  if (topCategory) {
    y = catBottom > pageHeight - 40 ? 24 : catBottom;
    if (catBottom > pageHeight - 40) doc.addPage();

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(2.5);
    doc.line(margin, y, margin, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Kategori Terkuat:', margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`${topCategory.name} — Laba ${formatRupiah(topCategory.profit)} (${topCategory.margin.toFixed(1)}% margin) dari ${topCategory.items} item`, margin + 6, y + 14);
  }

  // ==================== PAGE 5: TOP ITEMS ====================
  doc.addPage();
  y = 24;
  sectionHeader('Item Paling Menguntungkan');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text('Top 10 — Total Laba Tertinggi', margin, y);
  y += 9;

  autoTable(doc, atOptions({
    startY: y,
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
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentWidth * 0.06, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.21 },
      2: { cellWidth: contentWidth * 0.14 },
      3: { halign: 'center', cellWidth: contentWidth * 0.10 },
      4: { halign: 'right', cellWidth: contentWidth * 0.14 },
      5: { halign: 'right', cellWidth: contentWidth * 0.13 },
      6: { halign: 'right', cellWidth: contentWidth * 0.13 },
      7: { halign: 'right', cellWidth: contentWidth * 0.09 },
    },
  }));

  const profitTableEnd = (doc as any).lastAutoTable.finalY + 12;
  y = profitTableEnd > pageHeight - 70 ? 24 : profitTableEnd;
  if (profitTableEnd > pageHeight - 70) doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text('Top 10 — Margin Tertinggi', margin, y);
  y += 9;

  autoTable(doc, atOptions({
    startY: y,
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
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fontSize: 8, cellPadding: 3 },
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
  }));

  // ==================== PAGE 6: COST STRUCTURE ====================
  doc.addPage();
  y = 24;
  sectionHeader('Analisis Struktur Biaya', 'Komposisi omzet, HPP, dan laba kotor');

  const costRatio = summary.totalRevenue > 0 ? (summary.totalCOGS / summary.grandTotal) * 100 : 0;
  const profitRatio = summary.grandTotal > 0 ? (summary.totalProfit / summary.grandTotal) * 100 : 0;

  autoTable(doc, atOptions({
    startY: y,
    head: [['Komponen', 'Nominal', 'Proporsi']],
    body: [
      ['Omzet Bruto', formatRupiah(summary.grandTotal), '100%'],
      ['Harga Pokok Penjualan (HPP)', formatRupiah(summary.totalCOGS), `${costRatio.toFixed(1)}%`],
      [
        { content: 'LABA KOTOR', styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? COLORS.success : COLORS.danger } },
        { content: formatRupiah(summary.totalProfit), styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? COLORS.success : COLORS.danger } },
        { content: `${profitRatio.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: summary.totalProfit >= 0 ? COLORS.success : COLORS.danger } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: contentWidth * 0.52 },
      1: { halign: 'right', cellWidth: contentWidth * 0.26 },
      2: { halign: 'right', cellWidth: contentWidth * 0.22 },
    },
  }));

  const costEnd = (doc as any).lastAutoTable.finalY + 14;
  y = costEnd > pageHeight - 70 ? 24 : costEnd;
  if (costEnd > pageHeight - 70) doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.text('Kontribusi Laba per Kategori', margin, y);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 4, margin + 26, y + 4);
  y += 13;

  autoTable(doc, atOptions({
    startY: y,
    head: [['Kategori', 'Laba', 'Kontribusi Laba', 'Margin']],
    body: categoryBreakdown.map(c => [
      c.name,
      formatRupiah(c.profit),
      `${summary.totalProfit > 0 ? ((c.profit / summary.totalProfit) * 100).toFixed(1) : '0.0'}%`,
      `${c.margin.toFixed(1)}%`,
    ]),
    columnStyles: {
      0: { cellWidth: contentWidth * 0.30, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: contentWidth * 0.28 },
      2: { halign: 'right', cellWidth: contentWidth * 0.22 },
      3: { halign: 'right', cellWidth: contentWidth * 0.20 },
    },
  }));

  // ==================== PAGE 7+: FULL ITEM DETAIL ====================
  doc.addPage();
  y = 24;
  sectionHeader('Detail Laba Rugi per Item', `Seluruh ${itemCount} item`);

  autoTable(doc, atOptions({
    startY: y,
    head: [['No', 'Item', 'Kategori', 'Qty', 'Pendapatan', 'Laba', 'Margin']],
    body: profitData.map((p, i) => [
      `${i + 1}`,
      p.menuName,
      p.category,
      `${p.totalQtySold}x`,
      formatRupiah(p.totalRevenue),
      formatRupiah(p.totalProfit),
      `${p.profitMargin.toFixed(1)}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 3, lineColor: COLORS.border },
    headStyles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentWidth * 0.06, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.24 },
      2: { cellWidth: contentWidth * 0.15 },
      3: { halign: 'center', cellWidth: contentWidth * 0.09 },
      4: { halign: 'right', cellWidth: contentWidth * 0.19 },
      5: { halign: 'right', cellWidth: contentWidth * 0.18 },
      6: { halign: 'right', cellWidth: contentWidth * 0.09 },
    },
  }));

  // ==================== SIGNATURES ====================
  const sigBoxW = 72;
  const detailEnd = (doc as any).lastAutoTable.finalY;
  const pageNum = (doc as any).internal.getNumberOfPages();

  // Determine which page the detail table ended on, and if there's room for signatures
  // autoTable finalY is relative to the page the table ends on
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
  doc.text('Bagian Keuangan', margin + sigBoxW / 2, sigY + 28, { align: 'center' });
  doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, margin + sigBoxW / 2, sigY + 34, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text('Disetujui Oleh:', pageWidth - margin - sigBoxW, sigY);
  doc.line(pageWidth - margin - sigBoxW, sigY + 22, pageWidth - margin, sigY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Manager / Owner', pageWidth - margin - sigBoxW / 2, sigY + 28, { align: 'center' });
  doc.text('Tanggal: ________________', pageWidth - margin - sigBoxW / 2, sigY + 34, { align: 'center' });

  // Signature footer
  drawFooter(null);

  // ==================== FOOTER ON MANUAL PAGES ====================
  // Pages 1-2 (cover, exec summary) don't have autoTable didDrawPage footer
  // Page 3+ have autoTable footers via didDrawPage
  // The signature page also needs footer (handled above)
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
    doc.text(`${settings.name} — Laporan Analisis Laba Rugi`, pageWidth / 2, pageHeight - 13, { align: 'center' });
    const pc = (doc as any).internal.getNumberOfPages();
    doc.text(`Hal ${i} / ${pc}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const filename = `Laporan_LabaRugi_${settings.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(filename);
};
