import { formatRupiah } from '@/lib/format';

// Banking-level color scheme
const BANKING_COLORS = {
  primary: '#1e3a8a',      // Navy Blue
  secondary: '#d97706',    // Gold
  accent: '#3b82f6',       // Blue
  success: '#059669',      // Emerald
  warning: '#d97706',      // Amber
  danger: '#dc2626',       // Red
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Define interface for report data
export interface TransactionItem {
  id: string;
  menuName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  totalAmount: number;
  paymentMethod: string;
  items: TransactionItem[];
  customerName?: string;
  status: string;
}

export interface ReportData {
  cafeName: string;
  cafeAddress?: string;
  reportDate: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  statisticData: {
    totalTransactions: number;
    totalRevenue: number;
    avgTransactionValue: number;
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
    paymentMethodDistribution: Array<{
      name: string;
      value: number;
    }>;
    hourlyDistribution: Array<{
      hour: string;
      transactions: number;
    }>;
  };
  transactions: Transaction[];
}

// Type definition for jsPDF and html2canvas to avoid import issues
declare global {
  interface Window {
    jsPDF: any;
  }
}

export class ReportGenerator {
  static async generateFinancialReport(reportData: ReportData): Promise<void> {
    // Dynamically import jspdf
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 25;
    let currentY = margin;

    // Add cover page
    currentY = this.addCoverPage(doc, reportData, pageWidth, pageHeight);

    // Add executive summary
    doc.addPage();
    currentY = this.addExecutiveSummary(doc, reportData, margin);

    // Add detailed analysis section
    doc.addPage();
    currentY = this.addDetailedAnalysis(doc, reportData, currentY, margin);

    // Add charts and visualizations
    currentY = this.addChartsSection(doc, reportData, currentY, margin);

    // Add transaction details
    currentY = this.addTransactionDetails(doc, reportData, currentY, margin);

    // Add appendices
    currentY = this.addAppendices(doc, reportData, currentY, margin);

    // Add footer to all pages
    this.addFooterToAllPages(doc, reportData);

    // Save the PDF
    const fileName = `Laporan_Keuangan_${reportData.cafeName.replace(/\s+/g, '_')}_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.pdf`;
    doc.save(fileName);
  }

  private static addCoverPage(doc: any, reportData: ReportData, pageWidth: number, pageHeight: number): number {
    const centerX = pageWidth / 2;

    // Background with subtle gradient effect
    doc.setFillColor(BANKING_COLORS.gray[50]);
    doc.rect(0, 0, pageWidth, pageHeight);

    // Decorative border
    doc.setDrawColor(BANKING_COLORS.primary);
    doc.setLineWidth(2);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Company logo placeholder
    doc.setFillColor(BANKING_COLORS.primary);
    doc.circle(centerX, 50, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('LOGO', centerX, 55, { align: 'center' });

    // Main title
    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('LAPORAN KEUANGAN', centerX, 90, { align: 'center' });

    doc.setFontSize(24);
    doc.text('ANALISIS BISNIS KAFE', centerX, 110, { align: 'center' });

    // Decorative line
    doc.setDrawColor(BANKING_COLORS.secondary);
    doc.setLineWidth(1);
    doc.line(centerX - 80, 125, centerX + 80, 125);

    // Cafe information
    doc.setTextColor(BANKING_COLORS.gray[700]);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(reportData.cafeName.toUpperCase(), centerX, 150, { align: 'center' });

    if (reportData.cafeAddress) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(reportData.cafeAddress, centerX, 170, { align: 'center' });
    }

    // Report period
    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('PERIODE LAPORAN', centerX, 200, { align: 'center' });

    doc.setTextColor(BANKING_COLORS.gray[600]);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`${reportData.dateRange.startDate} - ${reportData.dateRange.endDate}`, centerX, 220, { align: 'center' });

    // Date generated
    doc.text(`Dibuat pada: ${reportData.reportDate}`, centerX, 240, { align: 'center' });

    // Confidentiality notice
    doc.setTextColor(BANKING_COLORS.gray[500]);
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Dokumen Rahasia - Hanya untuk penggunaan internal', centerX, pageHeight - 40, { align: 'center' });

    return pageHeight;
  }

  private static addExecutiveSummary(doc: any, reportData: ReportData, margin: number): number {
    let currentY = margin;

    // Section header
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 5, 170, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('EXECUTIVE SUMMARY', margin + 5, currentY + 5);

    currentY += 25;
    doc.setTextColor(BANKING_COLORS.gray[800]);

    // Key metrics overview
    const { statisticData } = reportData;

    // Revenue highlight
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(BANKING_COLORS.success);
    doc.text('PERFORMANSI KEUANGAN UNGGULAN', margin, currentY);

    currentY += 15;
    doc.setTextColor(BANKING_COLORS.gray[700]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const summaryText = `Selama periode ${reportData.dateRange.startDate} hingga ${reportData.dateRange.endDate}, bisnis kafe menunjukkan performa yang solid dengan total pendapatan sebesar ${formatRupiah(statisticData.totalRevenue)} dari ${statisticData.totalTransactions} transaksi. Rata-rata nilai transaksi mencapai ${formatRupiah(statisticData.avgTransactionValue)}, menunjukkan efektivitas strategi penjualan yang diterapkan.`;

    const splitText = doc.splitTextToSize(summaryText, 170);
    doc.text(splitText, margin, currentY);

    currentY += splitText.length * 5 + 10;

    // Key performance indicators in cards
    currentY = this.addKPICards(doc, reportData, currentY, margin);

    // Key insights
    currentY += 10;
    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('WAWASAN KUNCI:', margin, currentY);

    currentY += 8;
    doc.setTextColor(BANKING_COLORS.gray[600]);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const insights = [
      `• Item terlaris "${statisticData.topSellingItems[0]?.name || 'N/A'}" menyumbang porsi signifikan terhadap total penjualan`,
      `• Pola aktivitas harian menunjukkan puncak transaksi pada jam-jam tertentu`,
      `• Distribusi metode pembayaran mengindikasikan preferensi pelanggan`,
      `• Tren pendapatan harian memberikan gambaran stabilitas bisnis`
    ];

    insights.forEach((insight: string, index: number) => {
      doc.text(insight, margin + 5, currentY + (index * 6));
    });

    return currentY + 30;
  }

  private static addKPICards(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { statisticData } = reportData;
    const cardWidth = 75;
    const cardHeight = 25;
    const cardsPerRow = 2;
    const spacing = 10;

    const kpis = [
      {
        label: 'Total Transaksi',
        value: statisticData.totalTransactions.toLocaleString('id-ID'),
        color: BANKING_COLORS.primary,
        bgColor: '#eff6ff'
      },
      {
        label: 'Pendapatan Total',
        value: formatRupiah(statisticData.totalRevenue),
        color: BANKING_COLORS.success,
        bgColor: '#f0fdf4'
      },
      {
        label: 'Rata-rata Transaksi',
        value: formatRupiah(statisticData.avgTransactionValue),
        color: BANKING_COLORS.secondary,
        bgColor: '#fffbeb'
      },
      {
        label: 'Item Terlaris',
        value: statisticData.topSellingItems[0]?.name || 'N/A',
        color: BANKING_COLORS.accent,
        bgColor: '#eff6ff'
      }
    ];

    kpis.forEach((kpi: any, index: number) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = margin + (col * (cardWidth + spacing));
      const y = currentY + (row * (cardHeight + 8));

      // Card background
      doc.setFillColor(kpi.bgColor);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

      // Border
      doc.setDrawColor(kpi.color);
      doc.setLineWidth(1);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');

      // Value
      doc.setTextColor(kpi.color);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(kpi.value, x + cardWidth/2, y + 12, { align: 'center' });

      // Label
      doc.setTextColor(BANKING_COLORS.gray[600]);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(kpi.label, x + cardWidth/2, y + 20, { align: 'center' });
    });

    const totalRows = Math.ceil(kpis.length / cardsPerRow);
    return currentY + (totalRows * (cardHeight + 8)) + 10;
  }

  private static addDetailedAnalysis(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    // Section header
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 5, 170, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ANALISIS RINCI', margin + 5, currentY + 5);

    currentY += 25;

    // Performance analysis text
    doc.setTextColor(BANKING_COLORS.gray[700]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const analysisText = `Analisis mendalam terhadap data transaksi periode ini mengungkap beberapa pola penting yang dapat menjadi landasan pengambilan keputusan strategis. Performa penjualan menunjukkan tren yang konsisten dengan puncak aktivitas pada hari-hari tertentu dalam seminggu.`;

    const splitText = doc.splitTextToSize(analysisText, 170);
    doc.text(splitText, margin, currentY);

    currentY += splitText.length * 5 + 15;

    // Add trend analysis
    return this.addTrendAnalysis(doc, reportData, currentY, margin);
  }

  private static addTrendAnalysis(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { dailyRevenue } = reportData.statisticData;

    if (dailyRevenue.length < 2) {
      return currentY + 20;
    }

    // Calculate trend
    const firstHalf = dailyRevenue.slice(0, Math.floor(dailyRevenue.length / 2));
    const secondHalf = dailyRevenue.slice(Math.floor(dailyRevenue.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum: number, day: any) => sum + day.revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum: number, day: any) => sum + day.revenue, 0) / secondHalf.length;

    const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    doc.setTextColor(BANKING_COLORS.gray[700]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ANALISIS TREN:', margin, currentY);

    currentY += 8;
    doc.setFont(undefined, 'normal');

    const trendText = `Tren pendapatan menunjukkan ${trendPercentage >= 0 ? 'pertumbuhan' : 'penurunan'} sebesar ${Math.abs(trendPercentage).toFixed(1)}% dari paruh pertama ke paruh kedua periode. Ini mengindikasikan ${trendPercentage >= 0 ? 'momentum positif' : 'perlunya evaluasi strategi'} dalam operasional bisnis.`;

    const splitText = doc.splitTextToSize(trendText, 170);
    doc.text(splitText, margin, currentY);

    return currentY + splitText.length * 5 + 15;
  }

  private static addChartsSection(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    // Section header
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 5, 170, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('VISUALISASI DATA', margin + 5, currentY + 5);

    currentY += 25;

    // Add sophisticated charts
    currentY = this.addProfessionalDailyRevenueChart(doc, reportData, currentY, margin);
    currentY = this.addProfessionalCategoryChart(doc, reportData, currentY + 10, margin);
    currentY = this.addProfessionalPaymentMethodChart(doc, reportData, currentY + 10, margin);
    currentY = this.addProfessionalHourlyChart(doc, reportData, currentY + 10, margin);

    return currentY + 10;
  }

  private static addProfessionalDailyRevenueChart(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { dailyRevenue } = reportData.statisticData;

    if (!dailyRevenue.length) {
      return currentY + 30;
    }

    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TREN PENDAPATAN HARIAN', margin, currentY);

    currentY += 8;

    // Chart dimensions
    const chartWidth = 160;
    const chartHeight = 60;
    const chartX = margin + 5;
    const chartY = currentY;

    // Chart background
    doc.setFillColor(BANKING_COLORS.gray[50]);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

    // Chart border
    doc.setDrawColor(BANKING_COLORS.gray[300]);
    doc.setLineWidth(0.5);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'S');

    // Grid lines
    doc.setDrawColor(BANKING_COLORS.gray[200]);
    doc.setLineWidth(0.3);
    for (let i = 1; i <= 4; i++) {
      const y = chartY + (i * chartHeight / 5);
      doc.line(chartX + 5, y, chartX + chartWidth - 5, y);
    }

    // Y-axis labels
    const maxValue = Math.max(...dailyRevenue.map((d: any) => d.revenue));
    doc.setTextColor(BANKING_COLORS.gray[600]);
    doc.setFontSize(8);
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue * i) / 5;
      const y = chartY + chartHeight - (i * chartHeight / 5);
      doc.text(formatRupiah(value), chartX - 20, y + 2, { align: 'right' });
    }

    // Draw bars with gradient effect
    const barWidth = Math.min((chartWidth - 20) / dailyRevenue.length, 12);
    const spacing = dailyRevenue.length > 1 ? ((chartWidth - 20) - (barWidth * dailyRevenue.length)) / (dailyRevenue.length - 1) : 0;

    dailyRevenue.forEach((day: any, index: number) => {
      const x = chartX + 10 + index * (barWidth + spacing);
      const barHeight = maxValue > 0 ? (day.revenue / maxValue) * (chartHeight - 10) : 0;

      // Shadow effect
      doc.setFillColor(BANKING_COLORS.gray[400]);
      doc.rect(x + 1, chartY + chartHeight - barHeight - 8, barWidth, barHeight);

      // Main bar with gradient
      const gradientSteps = 5;
      for (let i = 0; i < gradientSteps; i++) {
        const alpha = (gradientSteps - i) / gradientSteps;
        doc.setFillColor(
          BANKING_COLORS.accent + Math.floor(alpha * 255).toString(16).padStart(2, '0')
        );
        doc.rect(x, chartY + chartHeight - barHeight - 8 + (i * barHeight / gradientSteps), barWidth, barHeight / gradientSteps);
      }

      // Value label on top
      if (day.revenue > maxValue * 0.1) {
        doc.setTextColor(BANKING_COLORS.gray[700]);
        doc.setFontSize(7);
        doc.text(formatRupiah(day.revenue), x + barWidth/2, chartY + chartHeight - barHeight - 12, { align: 'center' });
      }

      // Date label
      doc.setTextColor(BANKING_COLORS.gray[500]);
      doc.text(day.date, x + barWidth/2, chartY + chartHeight + 5, { align: 'center' });
    });

    return currentY + chartHeight + 15;
  }

  private static addProfessionalCategoryChart(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { categoryDistribution } = reportData.statisticData;

    if (!categoryDistribution.length) {
      return currentY + 30;
    }

    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DISTRIBUSI KATEGORI PRODUK', margin, currentY);

    currentY += 8;

    // Chart dimensions
    const chartWidth = 160;
    const chartHeight = 60;
    const chartX = margin + 5;
    const chartY = currentY;

    // Chart background
    doc.setFillColor(BANKING_COLORS.gray[50]);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

    // Chart border
    doc.setDrawColor(BANKING_COLORS.gray[300]);
    doc.setLineWidth(0.5);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'S');

    // Calculate total and create pie chart
    const total = categoryDistribution.reduce((sum: number, cat: any) => sum + cat.value, 0);
    let currentAngle = 0;

    const colors = [BANKING_COLORS.primary, BANKING_COLORS.accent, BANKING_COLORS.success, BANKING_COLORS.secondary, BANKING_COLORS.warning];

    categoryDistribution.forEach((category: any, index: number) => {
      const percentage = category.value / total;
      const angle = percentage * 360;

      // Draw pie slice
      const color = colors[index % colors.length];

      // For simplicity, draw as horizontal bars instead of actual pie chart
      const barHeight = (percentage * (chartHeight - 10));
      const y = chartY + 5 + (index * (chartHeight - 10) / categoryDistribution.length);

      // Bar background
      doc.setFillColor(BANKING_COLORS.gray[200]);
      doc.rect(chartX + 5, y, chartWidth - 40, barHeight);

      // Bar fill
      doc.setFillColor(color);
      doc.rect(chartX + 5, y, (percentage * (chartWidth - 40)), barHeight);

      // Label and percentage
      doc.setTextColor(BANKING_COLORS.gray[700]);
      doc.setFontSize(8);
      doc.text(`${category.name} (${percentage * 100}%)`, chartX + 5, y + barHeight/2 + 2);

      // Value
      doc.setTextColor(BANKING_COLORS.gray[600]);
      doc.text(formatRupiah(category.value), chartX + chartWidth - 35, y + barHeight/2 + 2);
    });

    return currentY + chartHeight + 15;
  }

  private static addProfessionalPaymentMethodChart(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { paymentMethodDistribution } = reportData.statisticData;

    if (!paymentMethodDistribution.length) {
      return currentY + 30;
    }

    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DISTRIBUSI METODE PEMBAYARAN', margin, currentY);

    currentY += 8;

    // Similar structure to category chart but for payment methods
    const chartWidth = 160;
    const chartHeight = 50;
    const chartX = margin + 5;
    const chartY = currentY;

    doc.setFillColor(BANKING_COLORS.gray[50]);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

    doc.setDrawColor(BANKING_COLORS.gray[300]);
    doc.setLineWidth(0.5);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'S');

    const total = paymentMethodDistribution.reduce((sum: number, method: any) => sum + method.value, 0);

    paymentMethodDistribution.forEach((method: any, index: number) => {
      const percentage = method.value / total;
      const barHeight = Math.max(percentage * (chartHeight - 10), 8);
      const y = chartY + 5 + (index * (chartHeight - 10) / paymentMethodDistribution.length);

      // Bar background
      doc.setFillColor(BANKING_COLORS.gray[200]);
      doc.rect(chartX + 5, y, chartWidth - 40, barHeight);

      // Bar fill
      const colors = [BANKING_COLORS.success, BANKING_COLORS.accent, BANKING_COLORS.secondary];
      doc.setFillColor(colors[index % colors.length]);
      doc.rect(chartX + 5, y, percentage * (chartWidth - 40), barHeight);

      // Label and percentage
      doc.setTextColor(BANKING_COLORS.gray[700]);
      doc.setFontSize(8);
      doc.text(`${method.name} (${(percentage * 100).toFixed(1)}%)`, chartX + 5, y + barHeight/2 + 2);

      // Value
      doc.setTextColor(BANKING_COLORS.gray[600]);
      doc.text(formatRupiah(method.value), chartX + chartWidth - 35, y + barHeight/2 + 2);
    });

    return currentY + chartHeight + 15;
  }

  private static addProfessionalHourlyChart(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { hourlyDistribution } = reportData.statisticData;

    if (!hourlyDistribution.length) {
      return currentY + 30;
    }

    doc.setTextColor(BANKING_COLORS.primary);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('POLA AKTIVITAS HARIAN', margin, currentY);

    currentY += 8;

    // Chart dimensions
    const chartWidth = 160;
    const chartHeight = 50;
    const chartX = margin + 5;
    const chartY = currentY;

    // Chart background
    doc.setFillColor(BANKING_COLORS.gray[50]);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

    // Chart border
    doc.setDrawColor(BANKING_COLORS.gray[300]);
    doc.setLineWidth(0.5);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'S');

    // Grid lines
    doc.setDrawColor(BANKING_COLORS.gray[200]);
    doc.setLineWidth(0.3);
    for (let i = 1; i <= 4; i++) {
      const y = chartY + (i * chartHeight / 5);
      doc.line(chartX + 5, y, chartX + chartWidth - 5, y);
    }

    // Y-axis labels
    const maxValue = Math.max(...hourlyDistribution.map((h: any) => h.transactions));
    doc.setTextColor(BANKING_COLORS.gray[600]);
    doc.setFontSize(8);
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue * i) / 5);
      const y = chartY + chartHeight - (i * chartHeight / 5);
      doc.text(value.toString(), chartX - 15, y + 2, { align: 'right' });
    }

    // Draw line chart
    doc.setDrawColor(BANKING_COLORS.warning);
    doc.setLineWidth(2);

    if (hourlyDistribution.length > 1) {
      for (let i = 0; i < hourlyDistribution.length - 1; i++) {
        const x1 = chartX + 5 + (i * (chartWidth - 10) / (hourlyDistribution.length - 1));
        const y1 = chartY + chartHeight - 5 - (hourlyDistribution[i].transactions / maxValue) * (chartHeight - 10);
        const x2 = chartX + 5 + ((i + 1) * (chartWidth - 10) / (hourlyDistribution.length - 1));
        const y2 = chartY + chartHeight - 5 - (hourlyDistribution[i+1].transactions / maxValue) * (chartHeight - 10);

        doc.line(x1, y1, x2, y2);
      }
    }

    // Draw data points
    doc.setFillColor(BANKING_COLORS.warning);
    hourlyDistribution.forEach((hour: any, index: number) => {
      const x = chartX + 5 + (index * (chartWidth - 10) / (hourlyDistribution.length - 1));
      const y = chartY + chartHeight - 5 - (hour.transactions / maxValue) * (chartHeight - 10);

      // Draw filled circle with border
      doc.setDrawColor(255, 255, 255);
      doc.circle(x, y, 3, 'FD');
      doc.setDrawColor(BANKING_COLORS.warning);
      doc.circle(x, y, 3, 'S');
    });

    // Hour labels
    doc.setTextColor(BANKING_COLORS.gray[500]);
    doc.setFontSize(7);
    hourlyDistribution.forEach((hour: any, index: number) => {
      if (index % 2 === 0 || index === hourlyDistribution.length - 1) {
        const x = chartX + 5 + (index * (chartWidth - 10) / (hourlyDistribution.length - 1));
        doc.text(hour.hour, x, chartY + chartHeight + 8, { align: 'center' });
      }
    });

    return currentY + chartHeight + 15;
  }

  private static addTransactionDetails(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { transactions } = reportData;

    if (!transactions || transactions.length === 0) {
      return currentY + 20;
    }

    // Section header
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 5, 170, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('DETAIL TRANSAKSI', margin + 5, currentY + 5);

    currentY += 25;

    // Table
    const colWidths = [10, 35, 30, 25, 60];
    const rowHeight = 12;
    const tableWidth = colWidths.reduce((a: number, b: number) => a + b, 0);

    // Headers
    const headers = ['No', 'Waktu', 'Total', 'Metode', 'Items'];

    // Header background
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 8, tableWidth, rowHeight);

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    let colX = margin;
    headers.forEach((header: string, index: number) => {
      doc.text(header, colX + 5, currentY);
      colX += colWidths[index];
    });

    currentY += rowHeight + 2;

    // Reset colors for rows
    doc.setTextColor(BANKING_COLORS.gray[800]);
    doc.setFont(undefined, 'normal');

    // Draw rows (limit to 25 to fit page)
    const maxRows = 25;
    const rowsToShow = Math.min(transactions.length, maxRows);

    for (let i = 0; i < rowsToShow; i++) {
      const transaction = transactions[i];

      // Alternate row background
      if (i % 2 === 0) {
        doc.setFillColor(BANKING_COLORS.gray[50]);
        doc.rect(margin, currentY - rowHeight/2, tableWidth, rowHeight);
      }

      // Border
      doc.setDrawColor(BANKING_COLORS.gray[300]);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY - rowHeight/2, tableWidth, rowHeight);

      // Transaction data
      const cols = [
        transaction.id.substring(0, 10) + '...',
        new Date(transaction.timestamp).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        formatRupiah(transaction.totalAmount),
        transaction.paymentMethod,
        transaction.items.slice(0, 3).map((item: any) => `${item.menuName}×${item.quantity}`).join(', ') +
        (transaction.items.length > 3 ? '...' : '')
      ];

      colX = margin;
      cols.forEach((col: string, index: number) => {
        doc.setFontSize(index === 4 ? 7 : 9);
        doc.text(col, colX + 5, currentY);
        colX += colWidths[index];
      });

      currentY += rowHeight;

      // Page break check
      if (currentY > doc.internal.pageSize.height - 40 && i < rowsToShow - 1) {
        doc.addPage();
        currentY = margin + 20;

        // Re-add headers for new page
        doc.setFillColor(BANKING_COLORS.primary);
        doc.rect(margin, currentY - 8, tableWidth, rowHeight);

        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        colX = margin;
        headers.forEach((header: string, index: number) => {
          doc.text(header, colX + 5, currentY);
          colX += colWidths[index];
        });

        currentY += rowHeight + 2;
        doc.setTextColor(BANKING_COLORS.gray[800]);
        doc.setFont(undefined, 'normal');
      }
    }

    // Note if there are more transactions
    if (transactions.length > maxRows) {
      doc.setTextColor(BANKING_COLORS.gray[500]);
      doc.setFontSize(8);
      doc.text(`+ ${transactions.length - maxRows} transaksi lainnya tidak ditampilkan`, margin, currentY + 5);
      currentY += 10;
    }

    return currentY + 15;
  }

  private static addAppendices(doc: any, reportData: ReportData, currentY: number, margin: number): number {
    const { topSellingItems } = reportData.statisticData;

    if (!topSellingItems.length) {
      return currentY + 20;
    }

    // Section header
    doc.setFillColor(BANKING_COLORS.primary);
    doc.rect(margin, currentY - 5, 170, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('LAMPIRAN: ITEM TERLARIS', margin + 5, currentY + 5);

    currentY += 25;

    // Table for top selling items
    const colWidths = [20, 60, 30, 50];
    const rowHeight = 12;
    const tableWidth = colWidths.reduce((a: number, b: number) => a + b, 0);

    // Headers
    const headers = ['No', 'Nama Menu', 'Terjual', 'Pendapatan'];

    // Header background
    doc.setFillColor(BANKING_COLORS.accent);
    doc.rect(margin, currentY - 8, tableWidth, rowHeight);

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    let colX = margin;
    headers.forEach((header: string, index: number) => {
      doc.text(header, colX + 5, currentY);
      colX += colWidths[index];
    });

    currentY += rowHeight + 2;

    // Reset colors for rows
    doc.setTextColor(BANKING_COLORS.gray[800]);
    doc.setFont(undefined, 'normal');

    // Draw rows
    topSellingItems.slice(0, 10).forEach((item: any, index: number) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(BANKING_COLORS.gray[50]);
        doc.rect(margin, currentY - rowHeight/2, tableWidth, rowHeight);
      }

      // Border
      doc.setDrawColor(BANKING_COLORS.gray[300]);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY - rowHeight/2, tableWidth, rowHeight);

      // Item data
      const cols = [
        (index + 1).toString(),
        item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
        item.count.toString(),
        formatRupiah(item.revenue)
      ];

      colX = margin;
      cols.forEach((col: string, colIndex: number) => {
        doc.setFontSize(colIndex === 1 ? 7 : 9);
        doc.text(col, colX + 5, currentY);
        colX += colWidths[colIndex];
      });

      currentY += rowHeight;
    });

    return currentY + 20;
  }

  private static addFooterToAllPages(doc: any, reportData: ReportData): void {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(BANKING_COLORS.primary);
      doc.setLineWidth(0.5);
      doc.line(20, doc.internal.pageSize.height - 25, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 25);

      // Footer text
      doc.setTextColor(BANKING_COLORS.gray[500]);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');

      // Left side - Cafe info
      doc.text(reportData.cafeName, 20, doc.internal.pageSize.height - 15);

      // Center - Confidentiality
      doc.setFont(undefined, 'italic');
      doc.text('Dokumen Rahasia - Hanya untuk penggunaan internal', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 15, { align: 'center' });

      // Right side - Page number
      doc.setFont(undefined, 'normal');
      doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 15, { align: 'right' });
    }
  }
}