"use client"

import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { PackageSearch, Zap, Boxes, BarChart3, Tags, Users, ArrowRight } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const cinematicReveal = {
  initial: { opacity: 0, y: 80, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } }
};

const cardStagger = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const sectionVariants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
};

function AnimatedSection({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id={id} className={className}>
      <motion.div
        initial="initial"
        animate={isInView ? "animate" : "initial"}
        variants={sectionVariants}
      >
        {children}
      </motion.div>
    </section>
  );
}

const features = [
  { icon: PackageSearch, t: "Manajemen Produk", d: "Tambah, ubah, dan nonaktifkan produk dengan kategori fleksibel, gambar produk, dan pengaturan harga yang mudah." },
  { icon: Zap, t: "Transaksi Cepat", d: "Antarmuka kasir yang dioptimalkan untuk kecepatan — pilih item, terapkan diskon, dan cetak struk dalam hitungan detik." },
  { icon: Boxes, t: "Manajemen Stok", d: "Pantau stok produk secara real-time, lakukan opname stok, dan terima notifikasi saat stok menipis." },
  { icon: BarChart3, t: "Laporan Profit", d: "Analisis laba mendalam dengan markup, margin, dan statistik penjualan lengkap yang bisa diekspor ke PDF." },
  { icon: Tags, t: "Kategori Produk", d: "Atur kategori produk dengan ikon dan warna khusus untuk memudahkan navigasi dan pengelompokan barang." },
  { icon: Users, t: "Multi-Role Access", d: "Atur hak akses kasir, manajer, dan superadmin secara terpisah dalam satu platform terpusat." },
];

const testimonials = [
  { q: "KasirKu benar-benar mengubah cara kami mengelola toko. Laporan harian jadi jauh lebih mudah dipahami.", n: "Raisa Andini", r: "Owner, Toko Sejahtera" },
  { q: "Antarmukanya bersih dan responsif. Tim kami langsung bisa pakai tanpa perlu pelatihan panjang.", n: "Bimo Wicaksono", r: "Manajer Operasional, Usaha Bersama" },
];

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const heroGlowOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroGlowScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.5]);

  useEffect(() => {
    if (!loading && user && userData) {
      router.push(userData.role === 'cashier' ? '/pos' : userData.role === 'superadmin' ? '/superadmin/users' : '/dashboard');
    }
  }, [user, userData, loading, router]);

  if (loading || (user && userData)) return null;

  return (
    <>
      <style>{`
        :root {
          --ink: #F7F6F2;
          --ink-soft: #FEFDFB;
          --cream: #3C3C38;
          --cream-dim: #6B6B66;
          --gold: #C9A83E;
          --gold-hover: #F4CF57;
          --line: rgba(0,0,0,0.08);
          --card-bg: #FEFDFB;
          --card-border: rgba(0,0,0,0.08);
          --section-bg: #EFEDE8;
          --hero-glow: rgba(201,168,62,0.08);
        }
        .dark {
          --ink: #181815;
          --ink-soft: #232320;
          --cream: #EDECE8;
          --cream-dim: #C5C4C0;
          --gold: #D4AF37;
          --gold-hover: #E8C84A;
          --line: rgba(255,255,255,0.08);
          --card-bg: var(--ink-soft);
          --card-border: var(--line);
          --section-bg: #121210;
          --hero-glow: rgba(212,175,55,0.12);
        }
        .font-display { font-family: var(--font-playfair), serif; }
        .noise::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.04;
        }
      `}</style>

      <div className="noise relative z-10">

        {/* Header */}
        <header
          className="fixed inset-x-0 top-0 z-50 py-5"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-2xl text-[var(--cream)] tracking-tight no-underline rounded-xl hover:opacity-80 transition-opacity">
              <img
                src="/logo.png"
                alt="KasirKu"
                className="w-8 h-8 rounded-lg object-cover"
              />
              KasirKu
            </Link>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <Link href="/signup" className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-[var(--cream)] rounded-full border border-[var(--line)] hover:bg-white/5 transition-colors no-underline">
                Daftar
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-black bg-[var(--gold)] rounded-full hover:bg-[var(--gold-hover)] transition-all hover:-translate-y-0.5 shadow-[0_4px_14px_rgba(201,168,62,0.25)] no-underline"
              >
                Masuk <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="relative overflow-hidden pt-32 pb-20 md:pt-56 md:pb-36 text-center">
            <motion.div
              className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] md:w-[1000px] md:h-[800px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, var(--hero-glow) 0%, transparent 70%)',
                opacity: heroGlowOpacity,
                scale: heroGlowScale,
              }}
            />
            <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
              <motion.div variants={fadeInUp} initial="initial" animate="animate" transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <span className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)] mb-5">
                  Sistem POS Terintegrasi
                </span>
              </motion.div>

              <motion.h1
                variants={cinematicReveal}
                initial="initial"
                animate="animate"
                className="font-display text-[clamp(44px,9vw,88px)] leading-[1.08] font-extrabold tracking-[-0.03em] mb-8"
                style={{ color: 'var(--cream)' }}
              >
                Kelola bisnis Anda<br />
                <em className="not-italic text-[var(--gold)]">lebih cerdas.</em>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(17px,2vw,22px)] text-[var(--cream-dim)] max-w-xl mx-auto mb-10 leading-relaxed"
              >
                Satu antarmuka elegan untuk transaksi harian, manajemen stok, dan laporan analitik yang mendalam.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-black bg-[var(--gold)] rounded-full hover:bg-[var(--gold-hover)] transition-all hover:-translate-y-0.5 no-underline shadow-[0_4px_18px_rgba(201,168,62,0.25)]"
                >
                  Mulai Gratis Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-[var(--cream)] rounded-full border border-[var(--line)] hover:bg-white/5 transition-colors no-underline"
                >
                  Masuk ke Akun
                </Link>
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <AnimatedSection
            id="fitur"
            className="py-20 md:py-36"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--section-bg))' }}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <motion.div
                className="text-center mb-16 md:mb-20"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)] mb-4">Fitur Utama</span>
                <h2 className="font-display text-[clamp(32px,5vw,48px)] font-bold text-[var(--cream)]">
                  Semua Kebutuhan Bisnis Anda
                </h2>
              </motion.div>

              <motion.div
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-50px" }}
              >
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    className="group p-7 md:p-10 rounded-[28px] border border-[var(--card-border)] hover:border-[var(--gold)] transition-all hover:-translate-y-1.5 duration-300"
                    style={{ background: 'var(--card-bg)' }}
                    variants={cardStagger}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: 'var(--gold)', color: '#000' }}
                    >
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-3 text-[var(--gold)]">{f.t}</h3>
                    <p className="text-[15px] leading-relaxed text-[var(--cream-dim)]">{f.d}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </AnimatedSection>

          {/* Testimonials */}
          <AnimatedSection id="testimoni" className="py-20 md:py-36" style={{ background: 'var(--ink)' }}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <motion.div
                className="text-center mb-16 md:mb-20"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)] mb-4">Testimoni</span>
                <h2 className="font-display text-[clamp(32px,5vw,48px)] font-bold text-[var(--cream)]">
                  Dipercaya Pelaku Bisnis
                </h2>
              </motion.div>

              <motion.div
                className="grid md:grid-cols-2 gap-6 md:gap-8"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-50px" }}
              >
                {testimonials.map((t, i) => (
                  <motion.div
                    key={i}
                    className="p-7 md:p-10 rounded-[28px] border border-[var(--card-border)] hover:border-[var(--gold)] transition-all hover:-translate-y-1 duration-300 border-l-[6px]"
                    style={{ background: 'var(--card-bg)', borderLeftColor: 'var(--gold)' }}
                    variants={cardStagger}
                  >
                    <p className="text-lg md:text-xl italic leading-relaxed mb-8 text-[var(--cream)]">
                      &ldquo;{t.q}&rdquo;
                    </p>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold text-black"
                        style={{ background: 'var(--gold)' }}
                      >
                        {t.n.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--cream)]">{t.n}</div>
                        <div className="text-sm font-semibold text-[var(--gold)]">{t.r}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection
            className="py-20 md:py-36 text-center"
            style={{ background: 'linear-gradient(to top, var(--ink), var(--section-bg))' }}
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <motion.h2
                className="font-display text-[clamp(36px,6vw,56px)] font-bold mb-6 text-[var(--cream)]"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                Siap Memajukan Bisnis Anda?
              </motion.h2>
              <motion.p
                className="text-lg md:text-xl text-[var(--cream-dim)] mb-10 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                Daftar sekarang dan nikmati kemudahan sistem KasirKu secara gratis.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              >
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-black bg-[var(--gold)] rounded-full hover:bg-[var(--gold-hover)] transition-all hover:-translate-y-0.5 no-underline shadow-[0_4px_18px_rgba(201,168,62,0.25)]"
                >
                  Daftar Sekarang — Gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </AnimatedSection>
        </main>

        {/* Footer */}
        <footer className="py-16 md:py-20 border-t border-[var(--line)]" style={{ background: 'var(--ink)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="font-display text-2xl font-extrabold text-[var(--cream)] mb-2">KasirKu</div>
                <p className="text-sm text-[var(--cream-dim)] max-w-sm">
                  Solusi POS modern untuk toko, kafe, restoran, dan retail di Indonesia.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--cream-dim)]">
                <a href="#fitur" className="hover:text-[var(--cream)] transition-colors no-underline">Fitur</a>
                <a href="#testimoni" className="hover:text-[var(--cream)] transition-colors no-underline">Testimoni</a>
                <Link href="/login" className="hover:text-[var(--cream)] transition-colors no-underline">Masuk</Link>
                <Link href="/signup" className="hover:text-[var(--cream)] transition-colors no-underline">Daftar</Link>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-[var(--line)] text-center text-xs text-[var(--cream-dim)]">
              &copy; {new Date().getFullYear()} KasirKu POS System. Memberikan solusi cerdas untuk bisnis Anda.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
