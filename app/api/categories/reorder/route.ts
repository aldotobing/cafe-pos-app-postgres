import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { orders }: { orders: { id: string; sort_order: number }[] } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Array orders diperlukan" }, { status: 400 });
    }

    let cafeId = user.cafeId;
    if (user.role === 'superadmin') {
      cafeId = body.cafe_id ? parseInt(body.cafe_id) : user.cafeId;
    }

    if (!cafeId) {
      return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
    }

    const updates = orders.map(({ id, sort_order }) =>
      supabaseAdmin
        .from('categories')
        .update({ sort_order, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('cafe_id', cafeId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Reorder errors:', errors.map(e => e.error));
      return NextResponse.json({ error: "Gagal mengupdate urutan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reorder Categories Error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengupdate urutan" }, { status: 500 });
  }
}
