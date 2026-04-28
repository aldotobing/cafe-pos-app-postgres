import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const available = url.searchParams.get('available');
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // SECURE ISOLATION: Always filter by user's own cafeId
  let cafeId: number = user.cafeId || 0;
  if (user.role === 'superadmin') {
    const requestedCafeId = url.searchParams.get('cafe_id');
    cafeId = requestedCafeId ? parseInt(requestedCafeId) : (user.cafeId || 0);
  }
  
  if (!cafeId) {
    return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
  }

  try {
    // Build query dengan Supabase
    let query = supabaseAdmin
      .from('menu')
      .select('*, categories(id, name, color), product_variants(*)', { count: 'exact' })
      .eq('cafe_id', cafeId)
      .is('deleted_at', null)
      .order('name')
      .range(offset, offset + limit - 1);

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (available !== null) {
      query = query.eq('available', available === 'true');
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Menu GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      meta: { total: count, limit, offset }
    });

  } catch (error: any) {
    console.error('Menu GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/superadmin can create menu items
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  
  // SECURE ISOLATION: Prevent users from creating items for other cafes
  if (user.role !== 'superadmin') {
    if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
    body.cafe_id = user.cafeId;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('menu')
      .insert({
        cafe_id: body.cafe_id,
        name: body.name,
        category: body.category || 'Uncategorized',
        category_id: body.category_id,
        price: body.price,
        available: body.available ?? true,
        image_url: body.image_url,
        stock_quantity: body.stock_quantity || 0,
        hpp_price: body.hpp_price || 0,
        margin_percent: body.margin_percent || 30,
        min_stock: body.min_stock || 5,
        track_stock: body.track_stock || false,
        has_variants: body.has_variants || false,
        base_unit: body.base_unit || 'pcs',
        conversion_factor: body.conversion_factor || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Menu POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record initial stock mutation if stock > 0 and track_stock is enabled
    if (data && body.stock_quantity > 0 && body.track_stock) {
      try {
        const { randomUUID } = await import('crypto');
        await supabaseAdmin
          .from('stock_mutations')
          .insert({
            id: randomUUID(),
            menu_id: data.id,
            cafe_id: body.cafe_id,
            type: 'in',
            quantity: body.stock_quantity,
            hpp_price: body.hpp_price || 0,
            reference_type: 'initial_stock',
            notes: `Stok awal pembuatan produk: ${body.stock_quantity}`,
            created_by: user.id,
          });
      } catch (mutationErr) {
        console.error('[Menu POST] Failed to record initial stock mutation:', mutationErr);
        // Don't fail the entire request if mutation recording fails
      }
    }

    return NextResponse.json({ data, success: true }, { status: 201 });

  } catch (error: any) {
    console.error('Menu POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
