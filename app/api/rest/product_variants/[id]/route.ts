import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/rest/product_variants/[id] - Get single variant
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .select('*, menu!inner(cafe_id, name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Variant GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rest/product_variants/[id] - Update variant (same as PATCH)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });

      // Get variant untuk check cafe ownership via menu
      const { data: variant } = await supabaseAdmin
        .from('product_variants')
        .select('menu!inner(cafe_id)')
        .eq('id', id)
        .single();

      if ((variant as any)?.menu?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (body.variant_name !== undefined) updateData.variant_name = body.variant_name;
    if (body.sku !== undefined) updateData.sku = body.sku;
    // Handle price field (column name is 'price' in database)
    if (body.price !== undefined) updateData.price = body.price;
    if (body.stock_quantity !== undefined) updateData.stock_quantity = body.stock_quantity;
    if (body.hpp_price !== undefined) updateData.hpp_price = body.hpp_price;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Variant PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Variant PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/rest/product_variants/[id] - Update variant
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    
    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      
      // Get variant untuk check cafe ownership via menu
      const { data: variant } = await supabaseAdmin
        .from('product_variants')
        .select('menu!inner(cafe_id)')
        .eq('id', id)
        .single();
      
      if ((variant as any)?.menu?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (body.variant_name !== undefined) updateData.variant_name = body.variant_name;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.stock_quantity !== undefined) updateData.stock_quantity = body.stock_quantity;
    if (body.hpp_price !== undefined) updateData.hpp_price = body.hpp_price;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Variant PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Variant PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rest/product_variants/[id] - Soft delete variant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    
    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      
      // Get variant untuk check cafe ownership via menu
      const { data: variant } = await supabaseAdmin
        .from('product_variants')
        .select('menu!inner(cafe_id)')
        .eq('id', id)
        .single();
      
      if ((variant as any)?.menu?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Variant DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Variant DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
