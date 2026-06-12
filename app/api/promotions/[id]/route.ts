import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: promoId } = await params;
    const body = await request.json();
    const { name, type, value, minSubtotal, maxDiscount, appliesTo, targetItemIds, targetCategoryIds, isActive } = body;

    const { data: current, error: getError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', promoId)
      .single();

    if (getError || !current) {
      return NextResponse.json({ error: 'Promosi tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = value;
    if (minSubtotal !== undefined) updateData.min_subtotal = minSubtotal;
    if (maxDiscount !== undefined) updateData.max_discount = maxDiscount;
    if (appliesTo !== undefined) updateData.applies_to = appliesTo;
    if (targetItemIds !== undefined) updateData.target_item_ids = targetItemIds;
    if (targetCategoryIds !== undefined) updateData.target_category_ids = targetCategoryIds;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Prevent duplicate category/item usage: each category/item can only be in one promotion.
    if (targetCategoryIds?.length > 0 || targetItemIds?.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('promotions')
        .select('id, name, applies_to, target_category_ids, target_item_ids')
        .eq('cafe_id', current.cafe_id)
        .is('deleted_at', null)
        .neq('id', promoId) // exclude the promo being edited

      const conflicts: string[] = []

      if (appliesTo === 'categories' && targetCategoryIds?.length > 0) {
        for (const promo of (existing || [])) {
          const overlap = (promo.target_category_ids || []).filter((id: string) =>
            targetCategoryIds.includes(id)
          )
          if (overlap.length > 0) {
            conflicts.push(`"${promo.name}" (${overlap.length} kategori)`)
          }
        }
      }

      if (appliesTo === 'specific_items' && targetItemIds?.length > 0) {
        for (const promo of (existing || [])) {
          const overlap = (promo.target_item_ids || []).filter((id: string) =>
            targetItemIds.includes(id)
          )
          if (overlap.length > 0) {
            conflicts.push(`"${promo.name}" (${overlap.length} menu)`)
          }
        }
      }

      if (conflicts.length > 0) {
        return NextResponse.json(
          { error: `Sudah digunakan di promosi lain: ${conflicts.join(', ')}` },
          { status: 409 }
        )
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('promotions')
      .update(updateData)
      .eq('id', promoId);

    if (updateError) {
      console.error('[Promotion Update] Error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update Promotion Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: promoId } = await params;

    const { data: current, error: getError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', promoId)
      .single();

    if (getError || !current) {
      return NextResponse.json({ error: 'Promosi tidak ditemukan' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('promotions')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', promoId);

    if (deleteError) {
      console.error('[Promotion Delete] Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete Promotion Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
