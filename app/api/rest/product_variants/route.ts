import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/rest/product_variants?menu_id=xxx - List variants by product
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const menuId = url.searchParams.get('menu_id');
    const menuIds = url.searchParams.get('menu_ids'); // Comma-separated list for bulk fetch
    
    let query = supabaseAdmin
      .from('product_variants')
      .select('*, menu!inner(cafe_id, name)')
      .is('deleted_at', null);

    if (menuId) {
      query = query.eq('menu_id', menuId);
    } else if (menuIds) {
      // Bulk fetch: split comma-separated IDs
      const ids = menuIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        query = query.in('menu_id', ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Product Variants GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Product Variants GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rest/product_variants - Create new variant
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    // SECURE ISOLATION: Prevent users from creating items for other cafes
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      
      // Verify menu belongs to user's cafe
      const { data: menuItem } = await supabaseAdmin
        .from('menu')
        .select('cafe_id')
        .eq('id', body.menu_id)
        .single();
      
      if (menuItem?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden: Cannot create variants for other cafes" }, { status: 403 });
      }
    }

    const insertData = {
      menu_id: body.menu_id,
      variant_name: body.variant_name,
      sku: body.sku || null,
      price: body.price || body.price_adjustment || 0,
      stock_quantity: body.stock_quantity || 0,
      hpp_price: body.hpp_price || 0,
      barcode: body.barcode || null,
    };

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('Product Variants POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create attribute mappings if attribute_value_ids provided
    const attributeValueIds = body.attribute_value_ids;
    if (data?.id && Array.isArray(attributeValueIds) && attributeValueIds.length > 0) {
      try {
        const mappings = attributeValueIds.map((valueId: string) => ({
          variant_id: data.id,
          attribute_value_id: valueId,
        }));
        
        const { error: mappingError } = await supabaseAdmin
          .from('variant_attribute_mappings')
          .insert(mappings);
        
        if (mappingError) {
          console.error('Variant attribute mapping error:', mappingError);
          // Don't fail the entire request if mapping fails
        }
      } catch (mappingErr) {
        console.error('Failed to create attribute mappings:', mappingErr);
        // Don't fail the entire request if mapping fails
      }
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Product Variants POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
