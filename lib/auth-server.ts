import { createClient } from '@supabase/supabase-js'
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

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  try {
    // Get token dari cookie atau Authorization header
    const cookieHeader = request.headers.get("Cookie") || "";
    let token = cookieHeader.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1];
    
    // Fallback ke Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })

    // Verify token dan get user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null;
    }

    // Get user profile untuk role dan cafe_id
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email,
      role: (profile?.role as 'superadmin' | 'admin' | 'cashier') || 'cashier',
      cafeId: profile?.cafe_id || undefined,
      fullName: profile?.full_name,
      isActive: profile?.is_active ?? true,
      isApproved: profile?.is_approved ?? false,
    }
  } catch (error) {
    console.error('getAuthenticatedUser error:', error)
    return null
  }
}
