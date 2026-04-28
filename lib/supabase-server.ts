import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server-side Supabase admin client (bypasses RLS)
 * Use for: Admin operations, background jobs, data migrations
 */
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

/**
 * Get Supabase client dengan user session dari cookies
 * Use for: Server Components, Route handlers dengan user context
 */
export async function getServerSupabase() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  
  const supabase = createClient<Database>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      }
    }
  )
  
  return supabase
}

/**
 * Get current authenticated user dari Supabase Auth
 */
export async function getAuthenticatedUser(request?: Request) {
  try {
    // Try dari cookies dulu
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    
    if (token) {
      const supabase = createClient<Database>(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      )
      
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        // Get user profile untuk role dan cafe_id
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
      }
    }
    
    // Fallback: cek Authorization header
    if (request) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.split(' ')[1]
        const supabase = createClient<Database>(
          supabaseUrl,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
            global: {
              headers: { Authorization: `Bearer ${bearerToken}` }
            }
          }
        )
        
        const { data: { user }, error } = await supabase.auth.getUser()
        if (user && !error) {
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
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('getAuthenticatedUser error:', error)
    return null
  }
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: { role: string } | null,
  ...allowedRoles: string[]
): boolean {
  if (!user) return false
  return allowedRoles.includes(user.role)
}

/**
 * Require authentication helper untuk route handlers
 */
export async function requireAuth(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      user: null
    }
  }
  return { error: null, user }
}

/**
 * Require specific role helper
 */
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
