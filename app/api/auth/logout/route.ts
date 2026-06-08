import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  try {
    // Extract token from cookie to properly identify the session on the server
    const cookieHeader = request.headers.get('Cookie') || ''
    const accessToken = cookieHeader.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]

    if (accessToken) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      })
      await supabase.auth.signOut()
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? '; Secure' : ''
    const cookieSuffix = `HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`

    const response = NextResponse.json({ success: true })

    // Clear all Supabase auth cookies
    response.headers.append('Set-Cookie', `sb-access-token=; ${cookieSuffix}`)
    response.headers.append('Set-Cookie', `sb-refresh-token=; ${cookieSuffix}`)

    return response
  } catch (error) {
    console.error('Logout error:', error)

    // Even on error, clear cookies so the client doesn't stay in a broken auth state
    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? '; Secure' : ''
    const cookieSuffix = `HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`

    const response = NextResponse.json({ success: true })
    response.headers.append('Set-Cookie', `sb-access-token=; ${cookieSuffix}`)
    response.headers.append('Set-Cookie', `sb-refresh-token=; ${cookieSuffix}`)
    return response
  }
}
