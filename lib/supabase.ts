import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// ============================================================================
// CLIENT-SIDE SUPABASE CLIENT
// ============================================================================

/**
 * Client-side Supabase client untuk use di browser.
 * Gunakan ini untuk:
 * - Auth operations (login, logout, signup)
 * - Realtime subscriptions
 * - Data fetching dengan RLS (user's own data)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ============================================================================
// SERVER-SIDE SUPABASE CLIENTS
// ============================================================================

/**
 * Server-side client dengan anon key (RLS applies).
 * Gunakan ini untuk:
 * - Server Components
 * - Route handlers dengan user context
 */
export const createServerClient = () => {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Admin client dengan Service Role Key (bypasses RLS).
 * ⚠️ HANYA GUNAKAN DI SERVER-SIDE CODE YANG TRUSTED!
 * 
 * Gunakan ini untuk:
 * - Admin operations (manage users, cross-cafe queries)
 * - Background jobs
 * - Data migrations
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SupabaseClient = typeof supabase
export type Tables = Database['public']['Tables']
export type Enums = Database['public']['Enums']

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user dengan type safety
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Get user profile dengan role dan cafe info
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, cafes(id, name)')
    .eq('user_id', userId)
    .single()
  
  if (error) return null
  return data
}

/**
 * Check user role
 */
export function hasRole(profile: Tables['user_profiles']['Row'] | null, role: Enums['user_role']) {
  return profile?.role === role
}

/**
 * Get cafe-scoped query builder
 * Otomatis apply cafe_id filter untuk RLS optimization
 * 
 * Tables dengan cafe_id: menu, categories, transactions, stock_mutations, 
 * cafe_settings, variant_attributes, push_subscriptions
 */
export function getCafeQuery(
  table: 'menu' | 'categories' | 'transactions' | 'stock_mutations' | 'cafe_settings' | 'variant_attributes' | 'push_subscriptions',
  cafeId: number
) {
  return supabase
    .from(table)
    .select('*')
    .eq('cafe_id', cafeId)
    .is('deleted_at', null)
}

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

export class SupabaseError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number = 500) {
    super(message)
    this.name = 'SupabaseError'
    this.code = code
    this.status = status
  }
}

/**
 * Handle Supabase errors dengan consistent format
 */
export function handleSupabaseError(error: any): never {
  if (error.code === 'PGRST116') {
    throw new SupabaseError('Resource not found', 'NOT_FOUND', 404)
  }
  if (error.code === '23505') {
    throw new SupabaseError('Duplicate entry', 'CONFLICT', 409)
  }
  if (error.code === '42501') {
    throw new SupabaseError('Permission denied', 'FORBIDDEN', 403)
  }
  throw new SupabaseError(
    error.message || 'Database error',
    error.code || 'DB_ERROR',
    500
  )
}

// ============================================================================
// REALTIME SUBSCRIPTION HELPERS
// ============================================================================

/**
 * Subscribe ke perubahan table untuk cafe tertentu
 * 
 * Tables dengan cafe_id: menu, categories, transactions, stock_mutations, 
 * cafe_settings, variant_attributes, push_subscriptions
 */
export function subscribeToCafeChanges(
  table: 'menu' | 'categories' | 'transactions' | 'stock_mutations' | 'cafe_settings' | 'variant_attributes' | 'push_subscriptions',
  cafeId: number,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`${table}_cafe_${cafeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: `cafe_id=eq.${cafeId}`,
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe ke stock changes (menu + variants)
 */
export function subscribeToStockChanges(
  cafeId: number,
  callback: (payload: any) => void
) {
  const menuChannel = supabase
    .channel(`stock_menu_${cafeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'menu',
        filter: `cafe_id=eq.${cafeId}`,
      },
      callback
    )
    .subscribe()

  return menuChannel
}

/**
 * Subscribe ke new transactions
 */
export function subscribeToNewTransactions(
  cafeId: number,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`transactions_${cafeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `cafe_id=eq.${cafeId}`,
      },
      callback
    )
    .subscribe()
}
