import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { ratelimit } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  // Authentication check
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin or superadmin can create cashier
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  // Rate limiting: 10 attempts per hour per user
  const { success, limit, remaining, reset } = await ratelimit.createCashier.limit(String(user.id));
  
  if (!success) {
    return NextResponse.json({ 
      error: "Terlalu banyak percobaan membuat kasir. Silakan coba lagi nanti.",
      code: "RATE_LIMITED",
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    });
  }

  try {
    const { email, password, fullName, cafeId } = await request.json();

    // Validate input
    if (!email || !password || !fullName || !cafeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Cafe isolation: non-superadmin can only create cashier for their own cafe
    if (user.role !== 'superadmin') {
      const targetCafeId = parseInt(cafeId, 10);
      if (targetCafeId !== user.cafeId) {
        return NextResponse.json(
          { error: 'Forbidden: Can only create users for your own cafe' },
          { status: 403 }
        );
      }
    }

    // Create user via Supabase Auth Admin API
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'cashier',
        cafe_id: parseInt(cafeId),
        is_approved: true,
      }
    });

    if (authError || !authUser.user) {
      console.error('Supabase Auth error:', authError);
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 409 }
        );
      }
      throw new Error(authError?.message || 'Failed to create user');
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authUser.user.id,
        full_name: fullName,
        role: 'cashier',
        cafe_id: parseInt(cafeId),
        is_approved: true,
        is_active: true,
        created_by: user.id,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't throw, user is created in auth
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cashier account created successfully',
      userId: authUser.user.id
    });
  } catch (error: any) {
    console.error('Error creating cashier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create cashier account' },
      { status: 500 }
    );
  }
}