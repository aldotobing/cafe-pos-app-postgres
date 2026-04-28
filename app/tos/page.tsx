'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-md border border-stone-200 overflow-hidden"
        >
          <div className="bg-amber-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Syarat dan Ketentuan</h1>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-amber-800">1. Penggunaan Aplikasi</h2>
              <p className="text-stone-700 leading-relaxed">
                Aplikasi ini disediakan untuk memudahkan pengelolaan transaksi. Dengan mengakses dan menggunakan aplikasi ini, Anda menyetujui ketentuan yang berlaku.
              </p>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-amber-800">2. Kewajiban Pengguna</h2>
              <p className="text-stone-700 mb-4 leading-relaxed">
                Sebagai pengguna, Anda bertanggung jawab untuk:
              </p>
              <ul className="space-y-2 pl-5">
                {[
                  'Menggunakan aplikasi sesuai dengan peruntukannya',
                  'Menjaga keamanan informasi akun',
                  'Mematuhi peraturan yang berlaku'
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (index * 0.1) }}
                    className="flex items-start text-stone-700"
                  >
                    <span className="text-amber-600 mr-2">•</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-amber-800">3. Pembaruan Aplikasi</h2>
              <p className="text-stone-700 leading-relaxed">
                Kami secara berkala merilis pembaruan untuk meningkatkan fungsionalitas dan keamanan aplikasi. Pastikan untuk selalu menggunakan versi terbaru.
              </p>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-amber-800">4. Perubahan Ketentuan</h2>
              <p className="text-stone-700 leading-relaxed">
                Ketentuan ini dapat diperbarui sesuai kebutuhan. Perubahan akan diinformasikan melalui aplikasi atau email.
              </p>
            </motion.section>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-6 mt-8 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center"
            >
              <p className="text-sm text-stone-500 mb-4 sm:mb-0">
                Terakhir diperbarui: 11 Oktober 2025
              </p>
              <Link 
                href="/" 
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Kembali ke Beranda
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}