import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Increase max duration to 60 seconds to handle large stock opname operations
export const maxDuration = 60;

// POST /api/stock/opname - OPTIMIZED with bulk operations
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { results, cafeId, userId } = body;


    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Data opname tidak valid" },
        { status: 400 }
      );
    }

    // Split into variants and non-variants
    const variantItems = results.filter((r: any) => r.variantId);
    const nonVariantItems = results.filter((r: any) => !r.variantId);

    const finalCafeId = parseInt(cafeId);
    if (!finalCafeId || isNaN(finalCafeId)) {
      return NextResponse.json({ error: "Invalid cafe_id" }, { status: 400 });
    }

    const mutationsToInsert: any[] = [];
    const mutationResults: any[] = [];

    // ========== PROCESS VARIANTS IN BULK ==========
    if (variantItems.length > 0) {
      const variantIds = variantItems.map((r: any) => r.variantId);
      
      // Fetch all variants in ONE query
      const { data: variants, error: variantsError } = await supabaseAdmin
        .from('product_variants')
        .select('id, variant_name, stock_quantity, hpp_price, menu_id, menu!inner(cafe_id)')
        .in('id', variantIds);

      if (variantsError) {
        console.error('[Stock Opname] Failed to fetch variants:', variantsError);
      }

      const variantMap = new Map((variants || []).map((v: any) => [v.id, v]));

      for (const item of variantItems) {
        const variant = variantMap.get(item.variantId);
        if (!variant) continue;

        const systemQty = variant.stock_quantity || 0;
        const variance = item.actualQty - systemQty;

        if (variance === 0) continue;

        // Record mutation with actual variance (can be positive or negative)
        // Trigger will auto-update stock by adding variance
        mutationsToInsert.push({
          id: randomUUID(),
          menu_id: item.menuId,
          variant_id: item.variantId,
          cafe_id: finalCafeId,
          type: 'opname',
          quantity: variance, // Use actual variance, not Math.abs
          hpp_price: variant.hpp_price,
          reference_type: 'opname',
          notes: item.notes || `Opname varian: ${systemQty} → ${item.actualQty} (selisih: ${variance > 0 ? '+' : ''}${variance})`,
          created_by: userId || user.id,
        });

        mutationResults.push({
          menuId: item.menuId,
          variantId: item.variantId,
          variantName: variant.variant_name,
          systemQty,
          actualQty: item.actualQty,
          variance,
        });
      }
    }

    // ========== PROCESS NON-VARIANTS IN BULK ==========
    if (nonVariantItems.length > 0) {
      const menuIds = nonVariantItems.map((r: any) => r.menuId);
      
      // Fetch all menu items in ONE query
      const { data: menuItems, error: menuError } = await supabaseAdmin
        .from('menu')
        .select('id, name, stock_quantity, hpp_price, cafe_id')
        .in('id', menuIds);

      if (menuError) {
        console.error('[Stock Opname] Failed to fetch menu:', menuError);
      }

      const menuMap = new Map((menuItems || []).map((m: any) => [m.id, m]));

      for (const item of nonVariantItems) {
        const menuItem = menuMap.get(item.menuId);
        if (!menuItem) continue;

        const systemQty = menuItem.stock_quantity || 0;
        const variance = item.actualQty - systemQty;

        if (variance === 0) continue;

        // Record mutation with actual variance (can be positive or negative)
        // Trigger will auto-update stock by adding variance
        mutationsToInsert.push({
          id: randomUUID(),
          menu_id: item.menuId,
          cafe_id: finalCafeId,
          type: 'opname',
          quantity: variance, // Use actual variance, not Math.abs
          hpp_price: menuItem.hpp_price,
          reference_type: 'opname',
          notes: item.notes || `Opname: ${systemQty} → ${item.actualQty} (selisih: ${variance > 0 ? '+' : ''}${variance})`,
          created_by: userId || user.id,
        });

        mutationResults.push({
          menuId: item.menuId,
          systemQty,
          actualQty: item.actualQty,
          variance,
        });
      }
    }

    // ========== BULK EXECUTE ==========
    
    // Bulk insert mutations (batch of 100) - trigger will auto-update stock
    if (mutationsToInsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < mutationsToInsert.length; i += BATCH_SIZE) {
        const batch = mutationsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabaseAdmin
          .from('stock_mutations')
          .insert(batch);
        
        if (insertError) {
          console.error('[Stock Opname] Failed to insert mutations batch:', insertError);
        }
      }
    }


    return NextResponse.json({
      success: true,
      adjusted: mutationResults.length,
      mutations: mutationResults,
    });
  } catch (err: any) {
    console.error("Stock Opname Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal melakukan stock opname" },
      { status: 500 }
    );
  }
}
