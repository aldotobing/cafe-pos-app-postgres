'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm sm:shadow-md border border-stone-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-amber-600 px-4 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-bold text-white">Kebijakan Privasi</h1>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h2 className="text-base sm:text-xl font-semibold text-amber-700">1. Tentang Aplikasi</h2>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Aplikasi ini adalah perangkat lunak Point of Sale (POS) yang disediakan sebagai layanan untuk memudahkan pengelolaan transaksi penjualan. Sebagai penyedia perangkat lunak, kami tidak mengumpulkan, menyimpan, atau memproses data transaksi pengguna.
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <h2 className="text-base sm:text-xl font-semibold text-amber-700">2. Penggunaan Data</h2>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Aplikasi ini memproses data transaksi dan informasi bisnis yang dimasukkan oleh pengguna. Data tersebut disimpan di server database yang dikelola oleh penyedia layanan. Sebagai pengembang aplikasi, kami tidak menyimpan salinan data transaksi pengguna di luar infrastruktur yang disediakan.
            </p>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Pengguna diharapkan untuk memahami bahwa keamanan data merupakan tanggung jawab bersama antara pengguna dan penyedia layanan database. Kami menyarankan untuk selalu menggunakan kredensial yang aman dan tidak membagikan akses ke pihak yang tidak berwenang.
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-base sm:text-xl font-semibold text-amber-700">3. Keamanan</h2>
            <p className="text-sm sm:text-base text-stone-700 mb-3 leading-relaxed">
              Meskipun kami tidak menyimpan data pengguna, kami merekomendasikan untuk:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Menggunakan kata sandi yang kuat untuk akun pengguna',
                'Melakukan pembaruan perangkat lunak secara berkala',
                'Menerapkan kebijakan keamanan yang sesuai di infrastruktur Anda'
              ].map((item, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + (index * 0.1) }}
                  className="flex items-start text-sm sm:text-base text-stone-700"
                >
                  <span className="text-amber-600 mr-2 mt-1">•</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-base sm:text-xl font-semibold text-amber-700">4. Pembaruan Perangkat Lunak</h2>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Kami secara berkala merilis pembaruan untuk meningkatkan kinerja dan keamanan aplikasi. Pengguna bertanggung jawab untuk memastikan bahwa mereka menggunakan versi terbaru dari perangkat lunak ini.
            </p>
          </motion.section>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4 mt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <p className="text-xs sm:text-sm text-stone-500">
              Terakhir diperbarui: 12 Oktober 2025
            </p>
            <Link 
              href="/" 
              className="inline-flex justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Kembali ke Beranda
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
