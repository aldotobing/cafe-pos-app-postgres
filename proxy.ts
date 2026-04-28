import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================================
// PROXY - Next.js 16 Convention (previously middleware.ts)
// SECURITY BEST PRACTICES:
// 1. Proxy hanya untuk "gatekeeping" - tidak validate token di sini
// 2. Token validation dilakukan di API routes (server-side)
// 3. Proxy hanya check keberadaan session cookies
// 4. Refresh token logic ditangani oleh Supabase client di browser
// ============================================================================

// Public routes yang tidak perlu authentication check
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
  '/site.webmanifest',
  '/.well-known',
  '/icons',
  '/sw.js',
]

// Static file extensions yang di-skip
const STATIC_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.webmanifest', '.txt']

function isPublicRoute(pathname: string): boolean {
  // Check exact match atau prefix match
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isStaticFile(pathname: string): boolean {
  return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))
}

function getAuthCookie(request: NextRequest): string | undefined {
  // Supabase cookies format: sb-<project-ref>-auth-token
  // Atau bisa juga sb-access-token
  const cookies = request.cookies
  
  // Cari cookie yang dimulai dengan 'sb-' dan mengandung 'auth' atau 'access-token'
  const authCookie = cookies.get('sb-access-token') || 
                     cookies.get('sb-refresh-token')
  
  // Juga check untuk format cookie Supabase SSR
  const allCookies = cookies.getAll()
  const supabaseAuthCookie = allCookies.find(c => 
    c.name.startsWith('sb-') && (c.name.includes('auth-token') || c.name.includes('access-token'))
  )
  
  return authCookie?.value || supabaseAuthCookie?.value
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip static files dan public routes
  if (isStaticFile(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. Check for any auth cookie presence (bukan validation)
  // Actual token validation dilakukan di API routes
  const hasAuthCookie = !!getAuthCookie(request)
  
  if (!hasAuthCookie) {
    // 3. Redirect ke login dengan redirect param
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    
    // 4. Add security headers pada redirect response
    const response = NextResponse.redirect(loginUrl)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  }

  // 5. User mungkin punya session, allow access
  // Token validity akan di-check di API routes masing-masing
  const response = NextResponse.next()
  
  // 6. Add security headers untuk authenticated requests
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

// ============================================================================
// MATCHER CONFIGURATION - Next.js 16 Proxy Convention
// ============================================================================
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
