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

    let cafesData = data || [];

    // Fetch user details for the owners
    try {
      // Using listUsers might require pagination for very large datasets, 
      // but for standard cafe sizes it is okay to fetch and map.
      // Alternatively, we query user_profiles to at least get the names.
      const ownerIds = [...new Set(cafesData.map((c: any) => c.owner_user_id))].filter(Boolean);
      
      if (ownerIds.length > 0) {
        // We'll get user profiles for names
        const { data: profilesData } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', ownerIds);
          
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

        // Fetch emails securely for specific owner IDs using Promise.all to avoid pagination limits of listUsers()
        const authDataPromises = ownerIds.map(id => supabaseAdmin.auth.admin.getUserById(id));
        const authResults = await Promise.all(authDataPromises);
        
        const authMap = new Map();
        authResults.forEach(({ data, error }) => {
          if (!error && data?.user) {
            authMap.set(data.user.id, data.user);
          }
        });

        cafesData = cafesData.map((cafe: any) => ({
          ...cafe,
          owner: {
            full_name: profileMap.get(cafe.owner_user_id)?.full_name || 'Unknown',
            email: authMap.get(cafe.owner_user_id)?.email || 'Unknown'
          }
        }));
      }
    } catch (e) {
      console.error('Error fetching owner details:', e);
      // We don't fail the request if just owner details fail
    }

    return NextResponse.json({ cafes: cafesData });
  } catch (error) {
    console.error('Error in cafes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
