import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let cafeId = searchParams.get('cafeId');

    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      cafeId = user.cafeId.toString();
    }

    if (!cafeId) {
      return NextResponse.json({ error: "Cafe ID diperlukan" }, { status: 400 });
    }

    const { data: promotions, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('cafe_id', parseInt(cafeId))
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Promotions API] Supabase error:', error);
      throw error;
    }

    const formatted = (promotions || []).map((p: any) => ({
      id: p.id,
      cafeId: p.cafe_id,
      name: p.name,
      type: p.type,
      value: Number(p.value),
      minSubtotal: Number(p.min_subtotal || 0),
      maxDiscount: p.max_discount ? Number(p.max_discount) : null,
      appliesTo: p.applies_to,
      targetItemIds: p.target_item_ids || [],
      targetCategoryIds: p.target_category_ids || [],
      isActive: Boolean(p.is_active),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({ promotions: formatted });
  } catch (err: any) {
    console.error("Get Promotions Error:", err);
    return NextResponse.json({ promotions: [] });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    let { cafeId, name, type, value, minSubtotal, maxDiscount, appliesTo, targetItemIds, targetCategoryIds } = body;

    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      cafeId = user.cafeId;
    }

    if (!cafeId || !name || !type) {
      return NextResponse.json({ error: "Cafe ID, nama, dan tipe promo wajib diisi" }, { status: 400 });
    }

    // Prevent duplicate category/item usage: each category/item can only be in one promotion.
    if (targetCategoryIds?.length > 0 || targetItemIds?.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('promotions')
        .select('id, name, applies_to, target_category_ids, target_item_ids')
        .eq('cafe_id', parseInt(cafeId.toString()))
        .is('deleted_at', null)

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

    const { data: promo, error } = await supabaseAdmin
      .from('promotions')
      .insert({
        cafe_id: parseInt(cafeId.toString()),
        name,
        type,
        value: value || 0,
        min_subtotal: minSubtotal || 0,
        max_discount: maxDiscount || null,
        applies_to: appliesTo || 'all',
        target_item_ids: targetItemIds || [],
        target_category_ids: targetCategoryIds || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Promotions API POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, promotion: promo });
  } catch (err: any) {
    console.error("Create Promotion Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
