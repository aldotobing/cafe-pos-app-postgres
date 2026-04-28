import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// PUT /api/categories/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: categoryId } = await params;
    const body = await request.json();
    const { name, icon, color, sortOrder, isActive } = body;

    // Get current category untuk check existence
    const { data: currentCategory, error: getError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();
    
    if (getError || !currentCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { error: updateError } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', categoryId);

    if (updateError) {
      console.error('[Category Update] Error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // CRITICAL: If name was updated, sync to menu items dengan category_id tersebut
    if (name !== undefined) {
      try {
        console.log(`[Category Update] Syncing new name "${name}" to menu items for category ${categoryId}`);
        await supabaseAdmin
          .from('menu')
          .update({ category: name })
          .eq('category_id', categoryId);
      } catch (syncErr) {
        console.error("Failed to sync category name to menu items:", syncErr);
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update Category Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengupdate kategori" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: categoryId } = await params;

    console.log('[Categories API DELETE] Deleting category:', categoryId);

    // Get current category
    const { data: currentCategory, error: getError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();
    
    if (getError || !currentCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Soft delete dengan set deleted_at
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .update({ 
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', categoryId);

    if (deleteError) {
      console.error('[Categories API DELETE] Error:', deleteError);
      return NextResponse.json({ 
        success: false,
        error: deleteError.message 
      }, { status: 500 });
    }

    console.log('[Categories API DELETE] Soft delete succeeded');
    return NextResponse.json({ 
      success: true,
      debug: process.env.NODE_ENV === 'development' ? {
        method: 'soft_delete',
        categoryId
      } : undefined
    });
  } catch (err: any) {
    console.error("Delete Category Error:", err);
    console.error("Delete Category Error stack:", err.stack);
    return NextResponse.json(
      { 
        error: err.message || "Gagal menghapus kategori",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
