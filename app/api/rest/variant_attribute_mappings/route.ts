import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// POST /api/rest/variant_attribute_mappings - Create mapping
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    console.log('POST variant_attribute_mappings - Received body:', body);

    // Verify variant exists first
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .select('id')
      .eq('id', body.variant_id)
      .single();

    if (variantError || !variant) {
      console.error('Variant Attribute Mapping - Variant not found:', body.variant_id);
      return NextResponse.json({ error: "Variant not found" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('variant_attribute_mappings')
      .insert({
        variant_id: body.variant_id,
        attribute_value_id: body.attribute_value_id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Variant Attribute Mapping POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('POST variant_attribute_mappings - Created:', data);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Variant Attribute Mapping POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
