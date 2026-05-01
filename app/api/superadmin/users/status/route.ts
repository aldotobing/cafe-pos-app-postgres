import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Verify superadmin role
  const { error, user } = await requireRole(request, 'superadmin');
  if (error) return error;

  try {
    // Get all users with last_login
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, last_login')
      .is('deleted_at', null);

    if (fetchError) {
      console.error('Error fetching user status:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
    }

    // Calculate online status (last_login < 5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const userStatus = users?.map(user => ({
      id: user.user_id,
      last_login: user.last_login,
      is_online: user.last_login ? new Date(user.last_login) > new Date(fiveMinutesAgo) : false
    })) || [];

    return NextResponse.json({ users: userStatus });
  } catch (error) {
    console.error('Error in user status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
