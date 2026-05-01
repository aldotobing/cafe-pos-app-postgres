import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { error } = await requireRole(request, 'superadmin');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let query = supabaseAdmin
      .from('cafes')
      .select(`
        *,
        owner:auth.users!cafes_owner_user_id_fkey (email, full_name),
        cafe_settings (*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching cafes:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch cafes' }, { status: 500 });
    }

    return NextResponse.json({ cafes: data || [] });
  } catch (error) {
    console.error('Error in cafes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
