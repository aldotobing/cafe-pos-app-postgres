import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/rest/variant_attribute_values - List attribute values
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const attributeId = url.searchParams.get('attribute_id');
    
    let query = supabaseAdmin
      .from('variant_attribute_values')
      .select('*, variant_attributes!inner(*)')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (attributeId) {
      query = query.eq('attribute_id', attributeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Variant Attribute Values GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Variant Attribute Values GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rest/variant_attribute_values - Create new attribute value
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    if (!body.attribute_id) {
      return NextResponse.json({ error: "attribute_id is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('variant_attribute_values')
      .insert({
        attribute_id: String(body.attribute_id),
        value: body.value,
        sort_order: body.sort_order || 0,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Variant Attribute Values POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Variant Attribute Values POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
