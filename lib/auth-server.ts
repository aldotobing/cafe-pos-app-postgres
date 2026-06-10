import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'cashier';
  cafeId?: number;
  fullName?: string;
  isActive: boolean;
  isApproved: boolean;
}

const userCache = new Map<string, { data: AuthenticatedUser; timestamp: number }>()
const CACHE_TTL = 5_000

export async function getAuthenticatedUser(_request?: Request): Promise<AuthenticatedUser | null> {
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

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    const cached = userCache.get(user.id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const result: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: (profile?.role as 'superadmin' | 'admin' | 'cashier') || 'cashier',
      cafeId: profile?.cafe_id || undefined,
      fullName: profile?.full_name,
      isActive: profile?.is_active ?? true,
      isApproved: profile?.is_approved ?? false,
    }

    userCache.set(user.id, { data: result, timestamp: Date.now() })

    if (userCache.size > 100) {
      const now = Date.now()
      for (const [key, entry] of userCache) {
        if (now - entry.timestamp > CACHE_TTL) userCache.delete(key)
      }
    }

    return result
  } catch (error) {
    console.error('getAuthenticatedUser error:', error)
    return null
  }
}
