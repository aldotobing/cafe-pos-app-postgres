import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from '@/lib/auth-context';
import { LoadingProvider } from '@/lib/loading-context';
import { CartProvider } from '@/contexts/cart-context';
import { SWRProvider } from '@/components/swr-provider';
import PWARegister from '@/components/pwa-register';
import PWAInstallPrompt from '@/components/pwa-install-prompt';
import { ToasterWithTheme } from '@/components/toaster-with-theme';
import { ThemeProvider } from 'next-themes';
import "./globals.css"
import { Viewport } from 'next'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const title = 'KasirKu - Aplikasi Kasir POS Modern untuk Semua Jenis Bisnis';
const description = 'Kelola transaksi, produk, stok, dan laporan profit bisnis Anda dengan mudah. Sistem POS berbasis web yang cepat, modern, dan gratis untuk toko, kafe, restoran, dan retail. Coba sekarang di kasirku.biz.id';
const url = 'https://kasirku.biz.id';

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: title,
    template: '%s | KasirKu POS',
  },
  description: description,
  generator: 'KasirKu',
  applicationName: 'KasirKu',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'aplikasi kasir',
    'point of sale',
    'POS system',
    'kasir toko',
    'kasir online',
    'sistem kasir online',
    'manajemen stok',
    'laporan profit',
    'aplikasi kasir gratis',
    'kasir berbasis web',
    'aplikasi kasir Indonesia',
    'sistem kasir PWA',
    'aplikasi retail',
    'kasir untuk toko',
    'POS umum',
  ],
  authors: [{ name: 'KasirKu Team' }],
  creator: 'KasirKu',
  publisher: 'KasirKu',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(url),
  alternates: {
    canonical: url,
  },
  openGraph: {
    title: title,
    description: description,
    url: url,
    siteName: 'KasirKu POS System',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KasirKu - Aplikasi Kasir Modern untuk Semua Jenis Bisnis',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
    images: ['/og-image.png'],
    creator: '@kasirku',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#000000' }
    ]
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KasirKu',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KasirKu POS',
    description: 'Aplikasi kasir POS modern untuk semua jenis bisnis. Kelola transaksi, produk, stok, dan laporan profit dengan mudah.',
    url: url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
    },
    author: {
      '@type': 'Organization',
      name: 'KasirKu Team',
      url: url,
    },
  };

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${plusJakarta.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="kasirku-theme">
          <AuthProvider>
            <LoadingProvider>
              <CartProvider>
                <SWRProvider>
                  <Suspense fallback={
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="mt-4 text-sm text-muted-foreground font-medium">
                        Memuat aplikasi...
                      </p>
                    </div>
                  </div>
                }>
                  {children}
                  <ToasterWithTheme />
                  <PWARegister />
                  <PWAInstallPrompt />
                  <Analytics />
                </Suspense>
                </SWRProvider>
              </CartProvider>
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
