import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// DELETE /api/rest/variant_attributes/[id] - Delete attribute
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const attributeId = id;

    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      
      // Get attribute untuk check cafe ownership
      const { data: attribute } = await supabaseAdmin
        .from('variant_attributes')
        .select('cafe_id')
        .eq('id', attributeId as any)
        .single();
      
      if (attribute?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('variant_attributes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attributeId as any)
      .select()
      .single();

    if (error) {
      console.error('Variant Attribute DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Variant Attribute DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
