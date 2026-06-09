import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ratelimit, getClientIP } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const ip = getClientIP(request)
  const { success, limit, remaining, reset } = await ratelimit.auth.limit(ip)

  if (!success) {
    return new Response(JSON.stringify({
      error: "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
      code: "RATE_LIMITED",
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    })
  }

  try {
    const { email, password } = await request.json()
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (profile?.is_active === false) {
      const response = NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
      response.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
      response.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })
      return response
    }

    await supabaseAdmin
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', data.user.id)

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      userData: profile ? {
        ...profile,
        id: profile.user_id,
        email: data.user.email,
      } : null,
    })

    // Also set sb-access-token / sb-refresh-token for backward compat with existing /api/auth/me
    if (data.session) {
      const isProduction = process.env.NODE_ENV === 'production'
      const secureFlag = isProduction ? '; Secure' : ''
      const accessMaxAge = data.session.expires_in ?? 3600
      const refreshMaxAge = 60 * 60 * 24 * 30

      response.headers.append(
        'Set-Cookie',
        `sb-access-token=${data.session.access_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${accessMaxAge}${secureFlag}`
      )
      response.headers.append(
        'Set-Cookie',
        `sb-refresh-token=${data.session.refresh_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${refreshMaxAge}${secureFlag}`
      )
    }

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
