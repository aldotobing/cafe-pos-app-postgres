import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function getAuthenticatedUser(request?: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      supabaseUrl,
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

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email,
      role: profile?.role || 'cashier',
      cafeId: profile?.cafe_id,
      fullName: profile?.full_name,
      isActive: profile?.is_active ?? true,
      isApproved: profile?.is_approved ?? false,
    }
  } catch (error) {
    console.error('getAuthenticatedUser error:', error)
    return null
  }
}

export function hasRole(
  user: { role: string } | null,
  ...allowedRoles: string[]
): boolean {
  if (!user) return false
  return allowedRoles.includes(user.role)
}

export async function requireRole(request: Request, ...allowedRoles: string[]) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      user: null
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
      user: null
    }
  }

  return { error: null, user }
}
