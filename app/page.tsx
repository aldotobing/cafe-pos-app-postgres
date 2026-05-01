"use client"

import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

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

function AnimatedSection({ children, className, style, id }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id={id} className={className} style={style}>
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
  { t: "Manajemen Produk", d: "Tambah, ubah, dan nonaktifkan produk dengan kategori fleksibel, gambar produk, dan pengaturan harga yang mudah." },
  { t: "Transaksi Cepat", d: "Antarmuka kasir yang dioptimalkan untuk kecepatan — pilih item, terapkan diskon, dan cetak struk dalam hitungan detik." },
  { t: "Manajemen Stok", d: "Pantau stok produk secara real-time, lakukan opname stok, dan terima notifikasi saat stok menipis." },
  { t: "Laporan Profit", d: "Analisis laba mendalam dengan markup, margin, dan statistik penjualan lengkap yang bisa diekspor ke PDF." },
  { t: "Kategori Produk", d: "Atur kategori produk dengan ikon dan warna khusus untuk memudahkan navigasi dan pengelompokan barang." },
  { t: "Multi-Role Access", d: "Atur hak akses kasir, manajer, dan superadmin secara terpisah dalam satu platform terpusat." },
];

const testimonials = [
  { q: "KasirKu benar-benar mengubah cara kami mengelola toko. Laporan harian jadi jauh lebih mudah dipahami.", n: "Raisa Andini", r: "Owner, Toko Sejahtera" },
  { q: "Antarmukanya bersih dan responsif. Tim kami langsung bisa pakai tanpa perlu pelatihan panjang.", n: "Bimo Wicaksono", r: "Manajer Operasional, Usaha Bersama" },
];

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroGlowOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroGlowScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.5]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && user && userData) {
      router.push(userData.role === 'cashier' ? '/pos' : userData.role === 'superadmin' ? '/superadmin/users' : '/dashboard');
    }
  }, [user, userData, loading, router]);

  if (loading || (user && userData)) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;700&display=swap');

        :root {
          --ink: #F7F6F2;
          --ink-soft: #FEFDFB;
          --cream: #3C3C38;
          --cream-dim: #6B6B66;
          --gold: #C9A83E;
          --line: rgba(0,0,0,0.08);
          --card-bg: #FEFDFB;
          --card-border: rgba(0,0,0,0.08);
          --card-hover-border: var(--gold);
          --section-bg-alt: #EFEDE8;
          --text-primary: #363632;
          --text-secondary: #6B6B66;
          --header-bg: rgba(247,246,242,0.95);
          --hero-glow: rgba(201,168,62,0.08);
        }

        .dark {
          --ink: #181815;
          --ink-soft: #232320;
          --cream: #EDECE8;
          --cream-dim: #C5C4C0;
          --gold: #D4AF37;
          --line: rgba(255,255,255,0.08);
          --card-bg: var(--ink-soft);
          --card-border: var(--line);
          --card-hover-border: var(--gold);
          --section-bg-alt: #121210;
          --text-primary: #FFFFFF;
          --text-secondary: var(--cream-dim);
          --header-bg: rgba(12,12,10,0.98);
          --hero-glow: rgba(212,175,55,0.12);
        }

        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.04;
        }

        .display { font-family: 'Playfair Display', serif; }

        .gold-btn {
          background: var(--gold);
          color: #000 !important;
          font-weight: 700;
          padding: 16px 36px;
          border-radius: 50px;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 14px 0 rgba(201,168,62,0.2);
          cursor: pointer;
          outline: none;
        }
        .gold-btn:hover {
          background: #F4CF57;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(201,168,62,0.3);
        }
        .gold-btn:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 4px;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          padding: 48px 40px;
          border-radius: 28px;
          transition: border-color 0.3s, transform 0.3s;
          position: relative;
          z-index: 1;
        }
        .card:hover {
          border-color: var(--card-hover-border);
          transform: translateY(-4px);
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }

        .nav-desktop { display: none; }
        @media (min-width: 768px) {
          .nav-desktop { display: flex; gap: 8px; background: rgba(128,128,128,0.1); padding: 6px; border-radius: 50px; }
          .grid-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-3 { grid-template-columns: repeat(3, 1fr); }
        }

        section { padding: 140px 0; }

        .hero {
          padding: 240px 0 160px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .hero-glow {
          position: absolute;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 1000px; height: 800px;
          background: radial-gradient(ellipse at center, var(--hero-glow) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .section-header { margin-bottom: 64px; text-align: center; }
        .section-label { color: var(--gold); font-size: 13px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 16px; display: block; }

        .nav-link {
          padding: 10px 24px;
          color: var(--cream);
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 50px;
          transition: all 0.2s;
          cursor: pointer;
          outline: none;
        }
        .nav-link:hover, .nav-link:focus-visible {
          background: rgba(128,128,128,0.1);
        }
        .nav-link:focus-visible {
          box-shadow: 0 0 0 2px var(--gold);
        }

        .logo-link {
          font-size: 24px;
          font-weight: 800;
          color: var(--cream);
          text-decoration: none;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 10px;
          outline: none;
          border-radius: 12px;
          transition: opacity 0.2s;
        }
        .logo-link:focus-visible {
          box-shadow: 0 0 0 2px var(--gold);
        }
        .logo-link:hover {
          opacity: 0.8;
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '20px 0', background: isScrolled ? 'var(--header-bg)' : 'transparent', backdropFilter: 'blur(16px)', borderBottom: isScrolled ? '1px solid var(--line)' : 'none', transition: 'all 0.3s' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" className="logo-link">
              <img 
                src="/logo.png" 
                alt="KasirKu Logo" 
                style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
              />
              KasirKu
            </Link>
            <nav className="nav-desktop">
              <a href="#fitur" className="nav-link">Fitur</a>
              <a href="#testimoni" className="nav-link">Testimoni</a>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ThemeToggle />
              <Link href="/login" className="gold-btn" style={{ padding: '10px 24px', fontSize: 14 }}>Masuk</Link>
            </div>
          </div>
        </header>

        <main>
          <section className="hero">
            <motion.div className="hero-glow" style={{ opacity: heroGlowOpacity, scale: heroGlowScale }} />
            <div className="container">
              <motion.div variants={fadeInUp} initial="initial" animate="animate" transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <span className="section-label">Sistem POS Terintegrasi</span>
              </motion.div>
              <motion.h1
                variants={cinematicReveal}
                initial="initial"
                animate="animate"
                className="display"
                style={{ fontSize: 'clamp(48px, 9vw, 96px)', lineHeight: 1.1, fontWeight: 800, marginBottom: 32, letterSpacing: '-0.03em', color: 'var(--text-primary)', textShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
              >
                Kelola bisnis Anda<br />
                <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>lebih cerdas.</em>
              </motion.h1>
              <motion.p variants={fadeInUp} initial="initial" animate="animate" transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ fontSize: 'clamp(18px, 2.2vw, 24px)', color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto 48px', fontWeight: 400 }}>
                Satu antarmuka elegan untuk transaksi harian, manajemen stok, dan laporan analitik yang mendalam.
              </motion.p>
              <motion.div variants={fadeInUp} initial="initial" animate="animate" transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <Link href="/login" className="gold-btn" style={{ fontSize: 18 }}>Mulai Gratis Sekarang</Link>
              </motion.div>
            </div>
          </section>

          <AnimatedSection id="fitur" className="" style={{ background: 'linear-gradient(to bottom, var(--ink), var(--section-bg-alt))' }}>
            <div className="container">
              <motion.div className="section-header" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                <span className="section-label">Fitur Utama</span>
                <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)' }}>Semua Kebutuhan Bisnis Anda</h2>
              </motion.div>
              <motion.div className="grid-3" style={{ display: 'grid', gap: 32 }} variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, margin: "-50px" }}>
                {features.map((f, i) => (
                  <motion.div key={i} className="card" variants={cardStagger} whileHover={{ y: -6, transition: { duration: 0.25 } }}>
                    <h3 className="display" style={{ fontSize: 24, marginBottom: 14, color: 'var(--gold)' }}>{f.t}</h3>
                    <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.65 }}>{f.d}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </AnimatedSection>

          <AnimatedSection id="testimoni" className="" style={{ background: 'var(--ink)' }}>
            <div className="container">
              <motion.div className="section-header" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                <span className="section-label">Testimoni</span>
                <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)' }}>Dipercaya Pelaku Bisnis</h2>
              </motion.div>
              <motion.div className="grid-2" style={{ display: 'grid', gap: 32 }} variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, margin: "-50px" }}>
                {testimonials.map((t, i) => (
                  <motion.div key={i} className="card" variants={cardStagger} style={{ borderLeft: '6px solid var(--gold)' }} whileHover={{ y: -4, transition: { duration: 0.25 } }}>
                    <p style={{ fontSize: 20, fontStyle: 'italic', marginBottom: 28, color: 'var(--text-primary)', lineHeight: 1.6 }}>"{t.q}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>{t.n.charAt(0)}</div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t.n}</div>
                        <div style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>{t.r}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="" style={{ textAlign: 'center', background: 'linear-gradient(to top, var(--ink), var(--hero-glow))' }}>
            <div className="container">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', marginBottom: 28, color: 'var(--text-primary)' }}>Siap Memajukan Bisnis Anda?</h2>
              </motion.div>
              <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>Daftar sekarang dan nikmati kemudahan sistem KasirKu secara gratis.</motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}>
                <Link href="/login" className="gold-btn" style={{ fontSize: 18 }}>Daftar Sekarang — Gratis</Link>
              </motion.div>
            </div>
          </AnimatedSection>
        </main>

        <footer style={{ padding: '70px 0', borderTop: '1px solid var(--line)', textAlign: 'center', background: 'var(--ink)' }}>
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>KasirKu</div>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>&copy; 2026 KasirKu POS System. Memberikan solusi cerdas untuk bisnis Anda.</p>
            </motion.div>
          </div>
        </footer>
      </div>
    </>
  );
}
