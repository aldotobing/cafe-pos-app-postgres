import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('Cookie') || ''
    const refreshToken = cookieHeader.split('; ').find(row => row.startsWith('sb-refresh-token='))?.split('=')[1]

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Session refresh failed' }, { status: 401 })
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? '; Secure' : ''
    const accessMaxAge = data.session.expires_in ?? 3600
    const refreshMaxAge = 60 * 60 * 24 * 30

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      expires_at: data.session.expires_at,
    })

    response.headers.append(
      'Set-Cookie',
      `sb-access-token=${data.session.access_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${accessMaxAge}${secureFlag}`
    )
    response.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${data.session.refresh_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${refreshMaxAge}${secureFlag}`
    )

    return response
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
