import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
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

    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*, cafes(id, name)')
      .eq('user_id', user.id)
      .single()

    if (profile?.is_active === false) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
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
    })
  } catch (error) {
    console.error('Me route error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
