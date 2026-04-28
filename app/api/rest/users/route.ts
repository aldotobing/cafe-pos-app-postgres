import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Date range filters (Postgres)
    const createdAtGte = url.searchParams.get('created_at_gte') || url.searchParams.get('start_date');
    const createdAtLt = url.searchParams.get('created_at_lt') || url.searchParams.get('end_date');

    // SECURE ISOLATION: Superadmins see all, regular users only see users in their own cafe
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*, cafes(id, name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply date filters
    if (createdAtGte) {
      query = query.gte('created_at', createdAtGte);
    }
    if (createdAtLt) {
      query = query.lt('created_at', createdAtLt);
    }

    query = query.range(offset, offset + limit - 1);

    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      query = query.eq('cafe_id', user.cafeId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Users GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch emails from Supabase Auth Admin API for all user_ids
    const userIds = data?.map((u: any) => u.user_id) || [];
    let emailMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const authAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      const { data: { users } } = await authAdmin.auth.admin.listUsers();
      
      emailMap = (users || []).reduce((acc: any, au: any) => {
        acc[au.id] = au.email;
        return acc;
      }, {});
    }

    // Map user_id to id and add email for frontend compatibility
    const mappedData = data?.map((user: any) => ({
      ...user,
      id: user.user_id,
      email: emailMap[user.user_id] || '',
    })) || [];

    return NextResponse.json({
      data: mappedData,
      meta: { total: count, limit, offset }
    });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: "Unauthorized: Superadmin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Note: User creation via Supabase Auth should use /api/auth/signup
    // This endpoint is untuk update profile atau create profile untuk existing auth user
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: body.user_id,
        full_name: body.full_name,
        role: body.role || 'cashier',
        cafe_id: body.cafe_id,
        is_approved: body.is_approved ?? true,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Users POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
