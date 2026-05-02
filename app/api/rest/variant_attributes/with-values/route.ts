import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/rest/variant_attributes/with-values - Get all attributes with their values
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const cafeIdParam = url.searchParams.get('cafe_id');

    // SECURE ISOLATION
    let cafeId: number;
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      cafeId = user.cafeId;
    } else {
      if (!cafeIdParam && !user.cafeId) {
        return NextResponse.json({ error: "cafe_id is required" }, { status: 400 });
      }
      cafeId = cafeIdParam ? parseInt(cafeIdParam) : user.cafeId!;
    }

    // Get all attributes with their values in a SINGLE query using LEFT JOIN
    // Using !left to ensure attributes without values are also returned
    const { data: attributes, error: attrError } = await supabaseAdmin
      .from('variant_attributes')
      .select(`
        *,
        variant_attribute_values!left(
          id,
          value,
          sort_order,
          is_active,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('cafe_id', cafeId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'variant_attribute_values' });

    if (attrError) {
      console.error('Variant Attributes with Values GET error:', attrError);
      return NextResponse.json({ error: attrError.message }, { status: 500 });
    }

    // Transform data to match expected format
    const transformedData = (attributes || []).map((attr: any) => ({
      id: attr.id,
      cafe_id: attr.cafe_id,
      name: attr.name,
      sort_order: attr.sort_order,
      is_active: attr.is_active,
      created_at: attr.created_at,
      updated_at: attr.updated_at,
      deleted_at: attr.deleted_at,
      version: attr.version,
      values: (attr.variant_attribute_values || [])
        .filter((val: any) => val.id !== null && val.value !== null)
        .map((val: any) => ({
          id: val.id,
          attribute_id: attr.id,
          value: val.value,
          sort_order: val.sort_order,
          is_active: val.is_active,
          created_at: val.created_at,
          updated_at: val.updated_at,
        }))
    }));

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error('Variant Attributes with Values GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
