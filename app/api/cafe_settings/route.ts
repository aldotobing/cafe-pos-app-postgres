import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  // Authentication check
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const url = new URL(request.url);
  let cafeId = url.searchParams.get('cafe_id');
  
  // SECURE ISOLATION: Force user's own cafeId unless superadmin
  if (user.role !== 'superadmin') {
    if (!user.cafeId) {
      return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
    }
    cafeId = user.cafeId.toString();
  }

  try {
    let query = supabaseAdmin
      .from('cafe_settings')
      .select('*, cafes(*)')
      .is('deleted_at', null);

    if (cafeId) {
      query = query.eq('cafe_id', parseInt(cafeId));
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Cafe Settings Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Cafe Settings Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Authentication check
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // SECURE ISOLATION: Prevent users from creating settings for other cafes
    let cafeId = body.cafe_id;
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      cafeId = user.cafeId;
    }

    const { data, error } = await supabaseAdmin
      .from('cafe_settings')
      .insert({
        cafe_id: cafeId,
        name: body.name,
        address: body.address,
        phone: body.phone,
        logo_url: body.logo_url || body.logoUrl,
        tax_percent: body.tax_percent || 10,
        service_percent: body.service_percent || 5,
        currency: body.currency || 'IDR',
        enable_push_notifications: body.enable_push_notifications || false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Cafe Settings POST Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Cafe Settings Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
