import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/categories?cafeId=X
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let cafeId = searchParams.get('cafeId');

    // SECURE ISOLATION: Force user's own cafeId unless they are superadmin
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      cafeId = user.cafeId.toString();
    }

    if (!cafeId) {
      return NextResponse.json({ error: "Cafe ID diperlukan" }, { status: 400 });
    }

    console.log('[Categories API] Fetching for cafeId:', cafeId);

    // Fetch dari Supabase
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('cafe_id', parseInt(cafeId))
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Categories API] Supabase error:', error);
      throw error;
    }

    console.log('[Categories API] Found', categories?.length || 0, 'categories');

    const formattedCategories = (categories || []).map((c: any) => ({
      id: c.id,
      cafeId: c.cafe_id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sort_order,
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return NextResponse.json({ categories: formattedCategories });
  } catch (err: any) {
    console.error("Get Categories Error:", err);
    // Return empty categories instead of error to prevent UI breakage
    return NextResponse.json({ 
      categories: [],
      debug: process.env.NODE_ENV === 'development' ? { error: err.message } : undefined
    });
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    let { cafeId, name, icon, color, sortOrder } = body;

    // SECURE ISOLATION: Force category creation to user's own cafe
    if (user.role !== 'superadmin') {
      if (!user.cafeId) return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      cafeId = user.cafeId;
    }

    console.log('[Categories API POST] Creating category:', { cafeId, name, icon, color, sortOrder });

    if (!cafeId || !name) {
      return NextResponse.json(
        { error: "Cafe ID dan nama kategori wajib diisi" },
        { status: 400 }
      );
    }

    // Insert ke Supabase
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert({
        cafe_id: parseInt(cafeId.toString()),
        name,
        icon: icon || '',
        color: color || '#6B7280',
        sort_order: sortOrder || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Categories API POST] Supabase error:', error);
      return NextResponse.json(
        { error: error.message || "Gagal membuat kategori" },
        { status: 500 }
      );
    }

    console.log('[Categories API POST] Category created:', category);

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        cafeId: category.cafe_id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sort_order,
        isActive: Boolean(category.is_active),
      },
    });
  } catch (err: any) {
    console.error("Create Category Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}
