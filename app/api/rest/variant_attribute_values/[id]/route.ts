import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// DELETE /api/rest/variant_attribute_values/[id] - Delete attribute value
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('variant_attribute_values')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id as any)
      .select()
      .single();

    if (error) {
      console.error('Variant Attribute Value DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Variant Attribute Value DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
