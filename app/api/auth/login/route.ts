import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ratelimit, getClientIP } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  // Rate limiting: 5 attempts per 15 minutes per IP
  const ip = getClientIP(request);
  const { success, limit, remaining, reset } = await ratelimit.auth.limit(ip);
  
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
    });
  }

  try {
    const { email, password } = await request.json();

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })

    // Sign in dengan Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get user profile dengan supabaseAdmin (bypass RLS)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    // Check if user is active
    if (profile?.is_active === false) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
    }

    // Update last_login dengan supabaseAdmin (bypass RLS)
    await supabaseAdmin
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', data.user.id)

    // Prepare response dengan cookies
    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? '; Secure' : ''
    
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
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      }
    })

    const accessMaxAge = data.session?.expires_in ?? 3600;
    const refreshMaxAge = 60 * 60 * 24 * 30; // 30 days

    // Set access token cookie (short-lived)
    response.headers.append(
      'Set-Cookie',
      `sb-access-token=${data.session?.access_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${accessMaxAge}${secureFlag}`
    )

    // Set refresh token cookie (long-lived, for silent session renewal)
    response.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${data.session?.refresh_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${refreshMaxAge}${secureFlag}`
    )

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
