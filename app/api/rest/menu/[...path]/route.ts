import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { Database } from "@/types/supabase";

type MenuUpdate = Database['public']['Tables']['menu']['Update'];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { path } = await params;
    const menuId = path[0];

    const { data, error } = await supabaseAdmin
      .from('menu')
      .select('*, categories(id, name, color), product_variants(*)')
      .eq('id', menuId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Menu GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/superadmin can update menu items
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { path } = await params;
    const menuId = path[0];
    const body = await request.json();

    // Build update object dengan hanya fields yang disediakan
    const updateData: MenuUpdate = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.available !== undefined) updateData.available = body.available;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.stock_quantity !== undefined) updateData.stock_quantity = body.stock_quantity;
    if (body.hpp_price !== undefined) updateData.hpp_price = body.hpp_price;
    if (body.margin_percent !== undefined) updateData.margin_percent = body.margin_percent;
    if (body.min_stock !== undefined) updateData.min_stock = body.min_stock;
    if (body.track_stock !== undefined) updateData.track_stock = body.track_stock;
    if (body.has_variants !== undefined) updateData.has_variants = body.has_variants;
    if (body.base_unit !== undefined) updateData.base_unit = body.base_unit;
    if (body.conversion_factor !== undefined) updateData.conversion_factor = body.conversion_factor;

    const { data, error } = await supabaseAdmin
      .from('menu')
      .update(updateData)
      .eq('id', menuId)
      .select()
      .single();

    if (error) {
      console.error('Menu PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Menu PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/superadmin can delete menu items
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { path } = await params;
    const menuId = path[0];

    const deletedAt = new Date().toISOString();

    // Soft delete variants first (cascade soft delete)
    const { error: variantError } = await supabaseAdmin
      .from('product_variants')
      .update({ deleted_at: deletedAt })
      .eq('menu_id', menuId);

    if (variantError) {
      console.error('Menu DELETE - Variants error:', variantError);
      // Continue with menu delete even if variant delete fails
    }

    // Soft delete dengan set deleted_at
    const { data, error } = await supabaseAdmin
      .from('menu')
      .update({ deleted_at: deletedAt })
      .eq('id', menuId)
      .select()
      .single();

    if (error) {
      console.error('Menu DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Menu DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
