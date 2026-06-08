import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function GET(request: Request) {
  try {
    // Get token dari cookie atau Authorization header
    const cookieHeader = request.headers.get("Cookie") || "";
    const token = cookieHeader.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1] ||
                  request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // Get user dari token
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch complete user profile using admin client (bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*, cafes(id, name)')
      .eq('user_id', user.id)
      .single()

    if (profile?.is_active === false) {
      const isProduction = process.env.NODE_ENV === 'production'
      const secureFlag = isProduction ? '; Secure' : ''
      const cookieSuffix = `HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`

      const response = NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
      response.headers.append('Set-Cookie', `sb-access-token=; ${cookieSuffix}`)
      response.headers.append('Set-Cookie', `sb-refresh-token=; ${cookieSuffix}`)
      return response
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      userData: profile ? {
        ...profile,
        id: profile.user_id,
        cafe: profile.cafes,
        email: user.email,
      } : null,
      expires_at: session?.expires_at ?? null,
    });
  } catch (error) {
    console.error('Me route error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
