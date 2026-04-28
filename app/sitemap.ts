import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kasirku.biz.id'
  const now = new Date()

  return [
    // Halaman Utama (Landing Page) - Highest Priority
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },

    // Autentikasi
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Dashboard & Admin - Authenticated (lower priority for SEO)
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/admin-dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/cashier-dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/pos`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/pending-approval`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },

    // Manajemen Menu & Produk
    {
      url: `${baseUrl}/menu`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },

    // Manajemen Stok
    {
      url: `${baseUrl}/stock`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },

    // Transaksi
    {
      url: `${baseUrl}/transactions`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/receipt`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },

    // Laporan & Statistik
    {
      url: `${baseUrl}/reports/profit`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/reports`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/statistik`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },

    // Pengaturan
    {
      url: `${baseUrl}/settings`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },

    // Buat Kafe Baru
    {
      url: `${baseUrl}/create-cafe`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // Halaman Kebijakan & Legal
    {
      url: `${baseUrl}/policy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/tos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },

  ]
}
