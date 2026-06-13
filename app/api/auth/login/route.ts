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
    const { email, password, captchaToken } = await request.json()
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captchaToken || undefined },
    })

    if (error || !data.user) {
      console.error('Login error:', error?.message, error?.status);

      // Detect captcha-specific errors and return clear Indonesian messages
      if (error?.message?.includes('captcha')) {
        return NextResponse.json(
          { error: 'Verifikasi keamanan diperlukan. Pastikan Anda telah menyelesaikan captcha.', code: 'CAPTCHA_REQUIRED' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error?.message || 'Email atau password salah.', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Check email confirmation — replaces old superadmin approval flow
    if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
      return NextResponse.json(
        {
          error: 'Silakan verifikasi email Anda terlebih dahulu. Cek inbox atau spam Anda.',
          code: 'EMAIL_NOT_CONFIRMED',
        },
        { status: 403 }
      )
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (profile?.is_active === false) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
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

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
