// sw.js - Service Worker for KasirKu PWA

const CACHE_NAME = 'kasirku-v2.1.0';
const STATIC_CACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.ico',
  '/logo.png',
  '/images/logo.jpg',
  '/apple-touch-icon.png'
];

// Network timeout for API requests
// Phase 5.1: Increased timeout for better mobile network resilience
// Android 2G/3G and cold Cloudflare Workers need more time
const NETWORK_TIMEOUT = 15000; // 15 seconds for API calls
const NAVIGATION_TIMEOUT = 10000; // 10 seconds for page navigation
const MAX_RETRIES = 2; // Number of retries for failed requests

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened static cache');
        return cache.addAll(STATIC_CACHE_URLS);
      })
  );
  self.skipWaiting(); // Immediately take control of the page
});

// Fetch event - serve content with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip service worker for:
  // 1. Cross-origin requests (e.g., Supabase auth token refresh)
  //    The SW's retry/timeout logic interferes with auth and can cause
  //    "Returned response is null" errors when cache fallback returns undefined.
  // 2. Non-GET requests to external origins — these can't be cached anyway.
  const isCrossOrigin = url.origin !== self.location.origin;
  if (isCrossOrigin) {
    // Let the browser handle cross-origin requests directly.
    // This is critical for Supabase auth token refresh to work properly.
    return; // Do NOT call event.respondWith() — browser handles it natively
  }

  // Strategy 1: Navigation requests (pages) - Network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithRetry(request, NAVIGATION_TIMEOUT, MAX_RETRIES)
        .then((response) => {
          // Cache successful navigation responses
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.log('[SW] Navigation fetch failed after retries, using cache');
          notifyClients('NAVIGATION_ERROR', 'Gagal memuat halaman. Menggunakan versi offline.', {
            url: request.url,
            error: error.message
          });
          return caches.match('/').then((cached) => {
            if (cached) return cached;
            // Absolute fallback: return a simple HTML page if even the cache is empty
            return new Response(
              '<html><body><h1>Offline</h1><p>Silakan periksa koneksi internet Anda.</p></body></html>',
              { status: 503, headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // Strategy 2: API requests - Network first with timeout
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/upload/')) {
      // Uploads get longer timeout (30s) but no retries
      event.respondWith(
        fetchWithTimeout(request, 30000)
          .catch((error) => {
            console.log('[SW] Upload request failed:', url.pathname);
            notifyClients('UPLOAD_ERROR', 'Gagal mengunggah file. Coba lagi.', {
              url: url.pathname,
              error: error.message
            });
            return new Response(
              JSON.stringify({ error: 'upload_failed', message: error.message }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
      return;
    }

    event.respondWith(
      fetchWithRetry(request, NETWORK_TIMEOUT, MAX_RETRIES)
        .catch((error) => {
          console.log('[SW] API request failed after retries:', url.pathname);
          // Notify client about API failure
          notifyClients('API_ERROR', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', {
            url: url.pathname,
            error: error.message
          });
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No network connection', isOffline: true }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Strategy 3: Static assets (JS, CSS, images) - Cache first, network fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    // Skip non-HTTP(S) schemes (chrome-extension://, etc.) - Cache API doesn't support them
    if (!url.protocol.startsWith('http')) {
      return fetch(request);
    }

    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((error) => {
          console.log('[SW] Static asset fetch failed:', url.pathname, error.message);
          // Return a minimal error response so respondWith always gets a Response
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Fallback for other same-origin requests (GET or POST)
  // Skip non-HTTP(S) schemes entirely
  if (!url.protocol.startsWith('http')) {
    return; // Let browser handle non-HTTP natively
  }

  // Only apply retry/timeout to idempotent GET requests.
  // POST/PUT/DELETE (e.g., API writes, token refresh) go straight to network
  // — retrying them is dangerous and timeout+retry delays worsen the UX.
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch((error) => {
        console.log('[SW] Non-GET request failed:', url.pathname, error.message);
        return new Response(
          JSON.stringify({ error: 'offline', message: 'No network connection', isOffline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // GET fallback: network-first with retry, cache fallback
  event.respondWith(
    fetchWithRetry(request, NETWORK_TIMEOUT, MAX_RETRIES)
      .then((response) => {
        // Cache successful GET responses
        if (response && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch((err) => {
              console.log('[SW] Cache put failed (quota?):', err.message);
            });
          });
        }
        return response;
      })
      .catch((error) => {
        console.log('[SW] GET fallback failed after retries, trying cache:', url.pathname);
        // Try cache, but return an offline Response if cache is empty
        // — this prevents "Returned response is null" errors.
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No network connection', isOffline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
  );
});

// Activate event - clean up old caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        return self.clients.claim();
      });
    })
  );
});

// Helper: Fetch with timeout
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    )
  ]);
}

// Helper: Fetch with retry and exponential backoff
// Phase 5.1: Retry failed requests for better mobile network resilience
// IMPORTANT: Only retry on network/timeout errors, NOT on HTTP error responses.
// A 400/401/500 response from the server is a valid response — retrying it
// just wastes time and battery (especially for expired token refresh calls).
async function fetchWithRetry(request, timeout, maxRetries) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff: 0ms, 1000ms, 2000ms
      if (attempt > 0) {
        const delay = 1000 * attempt;
        console.log(`[SW] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const response = await fetchWithTimeout(request, timeout);
      // If we got ANY HTTP response (even an error), return it immediately.
      // Don't retry 4xx/5xx — the server already told us the result.
      return response;
    } catch (error) {
      lastError = error;
      console.log(`[SW] Fetch attempt ${attempt + 1} failed:`, error.message);
    }
  }
  throw lastError;
}

// Helper: Notify all clients about network errors
function notifyClients(type, message, details = {}) {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SW_ERROR',
        errorType: type,
        message: message,
        timestamp: new Date().toISOString(),
        ...details
      });
    });
  });
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notifikasi Baru', body: event.data.text() };
    }
  }

  const title = data.title || 'Transaksi Baru';
  const options = {
    body: data.body || 'Ada transaksi baru yang masuk.',
    icon: '/icon-192x192.png',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/transactions'
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
