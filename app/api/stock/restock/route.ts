import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// POST /api/stock/restock
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { menuId, variantId, quantity, hppPrice, notes, cafeId, userId } = body;

    if (!menuId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Menu ID dan jumlah stok wajib diisi" },
        { status: 400 }
      );
    }

    // If variantId is provided, restock variant stock
    if (variantId) {
      // Get current variant dengan menu info
      const { data: variant, error: variantError } = await supabaseAdmin
        .from('product_variants')
        .select('*, menu!inner(cafe_id)')
        .eq('id', variantId)
        .single();

      if (variantError || !variant) {
        return NextResponse.json({ error: "Varian tidak ditemukan" }, { status: 404 });
      }

      const currentStock = variant.stock_quantity || 0;
      const newStock = currentStock + quantity;

      // Get cafe_id dari menu relation
      const variantCafeId = (variant as any).menu?.cafe_id || cafeId;

      // Record mutation with variant_id - trigger will auto-update stock
      const mutationId = randomUUID();
      try {
        await supabaseAdmin
          .from('stock_mutations')
          .insert({
            id: mutationId,
            menu_id: menuId,
            variant_id: variantId,
            cafe_id: cafeId || variantCafeId,
            type: 'in',
            quantity: quantity,
            hpp_price: variant.hpp_price,
            reference_type: 'restock',
            notes: notes || `Restock varian: ${currentStock} → ${newStock}`,
            created_by: userId || user.id,
          });
      } catch (mutationErr) {
        console.error('[Restock API] Failed to record mutation:', mutationErr);
        return NextResponse.json({ error: 'Gagal mencatat mutasi' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        newStock,
        mutationId,
        variantId,
      });
    }

    // Original logic for non-variant products
    const { data: menuItem, error: menuError } = await supabaseAdmin
      .from('menu')
      .select('*')
      .eq('id', menuId)
      .single();

    if (menuError || !menuItem) {
      return NextResponse.json({ error: "Menu item tidak ditemukan" }, { status: 404 });
    }

    const currentStock = menuItem.stock_quantity || 0;
    const newStock = currentStock + quantity;
    const currentHppPrice = menuItem.hpp_price || 0;
    const marginPercent = menuItem.margin_percent || 30;

    let newHppPrice = currentHppPrice;
    let newPrice: number | undefined;
    
    if (hppPrice !== undefined) {
      newHppPrice = hppPrice;
      newPrice = Math.round(hppPrice * (1 + marginPercent / 100));
      
      // Update HPP and price if provided - stock will be updated by trigger
      const updateData: any = {
        hpp_price: hppPrice,
        margin_percent: marginPercent,
      };
      if (newPrice !== undefined) {
        updateData.price = newPrice;
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('menu')
        .update(updateData)
        .eq('id', menuId);

      if (updateError) {
        console.error('[Restock API] Failed to update menu:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Record mutation - trigger will auto-update stock
    const mutationId = randomUUID();
    try {
      await supabaseAdmin
        .from('stock_mutations')
        .insert({
          id: mutationId,
          menu_id: menuId,
          cafe_id: cafeId || menuItem.cafe_id,
          type: 'in',
          quantity: quantity,
          hpp_price: newHppPrice,
          reference_type: 'restock',
          notes: notes || `Restock: ${currentStock} → ${newStock}`,
          created_by: userId || user.id,
        });
    } catch (mutationErr) {
      console.error('[Restock API] Failed to record mutation:', mutationErr);
      return NextResponse.json({ error: 'Gagal mencatat mutasi' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newStock,
      mutationId,
    });
  } catch (err: any) {
    console.error("Stock Restock Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal melakukan restock" },
      { status: 500 }
    );
  }
}
