export const profitInfo = {
  totalRevenue: {
    title: "Total Pendapatan",
    content: {
      what: "Total Pendapatan adalah seluruh uang yang masuk dari transaksi penjualan dalam periode yang dipilih, sebelum dikurangi biaya apapun.\n\nIni mencakup semua pendapatan dari penjualan menu, termasuk pendapatan dari berbagai kategori produk.",
      how: "Dihitung dengan menjumlahkan semua nilai transaksi (subtotal) yang terjadi dalam rentang waktu yang dipilih.\n\nRumus:\nTotal = Σ (Harga Jual × Jumlah)\n\nDari semua item yang terjual dalam periode tersebut.",
      why: "Pendapatan adalah indikator utama seberapa besar bisnis Anda berputar.\n\nIni adalah dasar untuk menghitung profitabilitas dan efisiensi operasional bisnis Anda."
    }
  },
  totalCOGS: {
    title: "Total HPP",
    content: {
      what: "HPP (Harga Pokok Penjualan) adalah total biaya yang dikeluarkan untuk memproduksi atau membeli barang yang dijual.\n\nIni termasuk biaya bahan baku, produksi, dan pembelian barang dagangan.",
      how: "Dihitung dengan mengalikan HPP per unit dengan jumlah unit yang terjual.\n\nRumus:\nTotal HPP = Σ (HPP per Item × Jumlah Terjual)\n\nDari semua item yang terjual dalam periode tersebut.",
      why: "HPP menunjukkan berapa besar modal yang Anda keluarkan untuk menghasilkan penjualan.\n\nSemakin rendah HPP relatif terhadap pendapatan, semakin besar keuntungan yang didapat."
    }
  },
  totalProfit: {
    title: "Laba Kotor",
    content: {
      what: "Laba Kotor adalah selisih antara Total Pendapatan dan Total HPP.\n\nIni adalah keuntungan sebelum dikurangi biaya operasional lain seperti gaji karyawan, sewa, listrik, dll.",
      how: "Dihitung dengan mengurangkan Total HPP dari Total Pendapatan.\n\nRumus:\nLaba Kotor = Total Pendapatan − Total HPP\n\nJika positif, berarti pendapatan melebihi biaya produksi.",
      why: "Laba Kotor adalah indikator utama apakah bisnis Anda menghasilkan uang dari penjualan.\n\n• Warna Hijau = Untung\n• Warna Merah = Rugi\n\nIni adalah dasar untuk mengukur kesehatan finansial bisnis Anda."
    }
  },
  avgMargin: {
    title: "Margin Rata-rata",
    content: {
      what: "Margin Rata-rata (Gross Margin) adalah persentase keuntungan dari Total Pendapatan.\n\nIni menunjukkan berapa persen dari setiap rupiah penjualan yang menjadi keuntungan.",
      how: "Dihitung dengan membagi Laba Kotor dengan Total Pendapatan, lalu dikali 100%.\n\nRumus:\nMargin = (Laba Kotor ÷ Total Pendapatan) × 100%\n\nContoh:\nPendapatan = Rp 1.000.000\nLaba = Rp 250.000\nMargin = 25%",
      why: "Margin menunjukkan efisiensi pricing Anda.\n\nMargin 25% berarti dari setiap Rp 1.000 penjualan, Rp 250 adalah keuntungan.\n\nIndikator Warna:\n• 🟢 Hijau (≥50%) = Sangat baik\n• 🟠 Kuning (≥30%) = Cukup\n• 🔴 Merah (<30%) = Perlu ditingkatkan"
    }
  }
}
