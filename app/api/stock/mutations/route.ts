import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/stock/mutations
 * Body:
 * - id (required)
 * - menuId (required)
 * - variantId (optional)
 * - cafeId (required)
 * - type (required): 'in' | 'out' | 'adjustment' | 'opname'
 * - quantity (required)
 * - hppPrice (optional)
 * - referenceType (optional)
 * - referenceId (optional)
 * - notes (optional)
 * - createdBy (optional)
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      menuId,
      variantId,
      cafeId,
      type,
      quantity,
      hppPrice,
      referenceType,
      referenceId,
      notes,
      createdBy
    } = body;

    // Generate UUID for mutation ID
    const id = randomUUID();

    if (!menuId || !cafeId || !type || !quantity) {
      return NextResponse.json(
        { error: "Menu ID, Cafe ID, type, dan quantity wajib diisi" },
        { status: 400 }
      );
    }

    // SECURE ISOLATION: Force user's own cafeId unless superadmin
    const finalCafeId = user.role !== 'superadmin' ? user.cafeId : cafeId;
    if (user.role !== 'superadmin' && (!user.cafeId || user.cafeId !== cafeId)) {
      return NextResponse.json({ error: "Unauthorized: Cannot modify other cafe's stock" }, { status: 403 });
    }

    // Record mutation via Supabase
    const finalCreatedBy = createdBy || user.id;
    
    const { error } = await supabaseAdmin
      .from('stock_mutations')
      .insert({
        id,
        menu_id: menuId,
        variant_id: variantId || null,
        cafe_id: finalCafeId,
        type,
        quantity,
        hpp_price: hppPrice || null,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        notes: notes || null,
        created_by: finalCreatedBy,
      });

    if (error) {
      console.error('[Stock Mutation POST] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("Stock Mutation POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mencatat mutasi stok" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stock/mutations
 * Query Params:
 * - cafeId (required)
 * - limit (optional, default 10)
 * - offset (optional, default 0)
 * - menuId (optional)
 * - created_at_gte / start_date (optional)
 * - created_at_lt / end_date (optional)
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let cafeId = searchParams.get('cafeId');
    const menuId = searchParams.get('menuId');
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    // Date range filters (Postgres)
    const createdAtGte = searchParams.get('created_at_gte') || searchParams.get('start_date');
    const createdAtLt = searchParams.get('created_at_lt') || searchParams.get('end_date');

    // SECURE ISOLATION: Force user's own cafeId unless superadmin
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      cafeId = user.cafeId.toString();
    }

    if (!cafeId) {
      return NextResponse.json({ error: "Cafe ID diperlukan" }, { status: 400 });
    }

    // Fetch dari Supabase dengan pagination
    let query = supabaseAdmin
      .from('stock_mutations')
      .select('*', { count: 'exact' })
      .eq('cafe_id', parseInt(cafeId))
      .order('created_at', { ascending: false });

    // Apply date filters
    if (createdAtGte) {
      query = query.gte('created_at', createdAtGte);
    }
    if (createdAtLt) {
      query = query.lt('created_at', createdAtLt);
    }

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (menuId) {
      query = query.eq('menu_id', menuId);
    }

    
    const { data: mutations, error, count } = await query;
    
    if (error) {
      console.error('[Mutations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no records found, return early
    if (mutations.length === 0) {
      return NextResponse.json({
        mutations: [],
        hasMore: false,
        offset: parseInt(offset),
        limit: parseInt(limit)
      });
    }

    // Optimization: Fetch shared data (Menu names, Variants, and User names)
    // Fetch dari Supabase untuk mapping IDs ke readable names

    // 1. Fetch menu items for name mapping
    let menuMap: Record<string, string> = {};
    try {
      const { data: menuData } = await supabaseAdmin
        .from('menu')
        .select('id, name')
        .eq('cafe_id', parseInt(cafeId))
        .is('deleted_at', null);
      
      (menuData || []).forEach((m: any) => {
        menuMap[m.id] = m.name;
      });
    } catch (menuErr) {
      console.warn('[Mutations API] Failed to fetch menu names:', menuErr);
    }

    // 2. Fetch variants for name mapping
    let variantMap: Record<string, string> = {};
    try {
      const { data: variantData } = await supabaseAdmin
        .from('product_variants')
        .select('id, variant_name, menu_id')
        .in('menu_id', Object.keys(menuMap));
      
      const cafeMenuIds = Object.keys(menuMap);
      const filteredVariants = (variantData || []).filter((v: any) => cafeMenuIds.includes(v.menu_id));

      filteredVariants.forEach((v: any) => {
        variantMap[v.id] = v.variant_name || v.id;
      });
    } catch (variantErr) {
      console.warn('[Mutations API] Failed to fetch variant names:', variantErr);
    }

    // 3. Fetch users for name mapping
    let userMap: Record<string, string> = {};
    try {
      const { data: userData } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, full_name');
      
      (userData || []).forEach((u: any) => {
        userMap[u.user_id] = u.full_name || u.user_id;
      });
    } catch (userErr) {
      console.warn('[Mutations API] Failed to fetch user names:', userErr);
    }

    // Format mutations for frontend consumption
    const formattedMutations = mutations.map((m: any) => {
      const variantName = m.variant_id ? variantMap[m.variant_id] : null;
      return {
        id: m.id,
        menuId: m.menu_id,
        variantId: m.variant_id,
        menuName: menuMap[m.menu_id] || m.menu_name || 'Unknown',
        variantName: variantName,
        type: m.type,
        quantity: m.quantity,
        hppPrice: m.hpp_price,
        referenceType: m.reference_type,
        notes: m.notes,
        createdBy: m.created_by,
        createdByName: userMap[m.created_by] || m.created_by_name || m.created_by,
        createdAt: m.created_at,
      };
    });

    // Check if there might be more records (simple heuristic: if we got exactly 'limit' records)
    const hasMore = mutations.length >= parseInt(limit);

    return NextResponse.json({
      mutations: formattedMutations,
      hasMore,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (err: any) {
    console.error("Stock Mutations Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat riwayat mutasi" },
      { status: 500 }
    );
  }
}
