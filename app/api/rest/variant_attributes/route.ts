import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/rest/variant_attributes - List variant attributes
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let query = supabaseAdmin
      .from('variant_attributes')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      query = query.eq('cafe_id', user.cafeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Variant Attributes GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Variant Attributes GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rest/variant_attributes - Create new attribute
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    console.log('POST variant_attributes - Received body:', body);
    
    // SECURE ISOLATION
    let cafeId = body.cafe_id;
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      cafeId = user.cafeId;
    }

    const { data, error } = await supabaseAdmin
      .from('variant_attributes')
      .insert({
        cafe_id: cafeId,
        name: body.name,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Variant Attributes POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('POST variant_attributes - Created:', data);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Variant Attributes POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
