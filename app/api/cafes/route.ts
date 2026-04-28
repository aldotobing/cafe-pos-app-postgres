import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // Authentication check menggunakan Supabase
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    // 1. Create the cafe
    const { data: cafe, error: cafeError } = await supabaseAdmin
      .from('cafes')
      .insert({
        owner_user_id: user.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
      })
      .select()
      .single();

    if (cafeError) {
      console.error('[Cafe Creation] Error:', cafeError);
      throw new Error(`Failed to create cafe: ${cafeError.message}`);
    }

    // 2. Create default settings
    const { error: settingsError } = await supabaseAdmin
      .from('cafe_settings')
      .insert({
        cafe_id: cafe.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
        tax_percent: 10,
        service_percent: 5,
        currency: 'IDR',
        enable_push_notifications: false,
      });

    if (settingsError) {
      console.error('[Cafe Settings Creation] Error:', settingsError);
      // Don't throw, cafe is already created
    }

    // 3. Update user profile dengan cafe_id
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ cafe_id: cafe.id })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('[User Profile Update] Error:', profileError);
      // Don't throw
    }

    return NextResponse.json({ 
      success: true, 
      cafeId: cafe.id,
      cafe: {
        id: cafe.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
      }
    });
  } catch (error: any) {
    console.error('Cafe Creation Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}

// GET /api/cafes - List cafes untuk user
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let query = supabaseAdmin
      .from('cafes')
      .select('*, cafe_settings(*)')
      .is('deleted_at', null);

    // Non-superadmin hanya lihat cafe mereka
    if (user.role !== 'superadmin') {
      query = query.eq('owner_user_id', user.id);
    }

    const { data: cafes, error } = await query;

    if (error) {
      console.error('[Cafes GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      cafes: cafes || []
    });
  } catch (error: any) {
    console.error('Cafes GET Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
