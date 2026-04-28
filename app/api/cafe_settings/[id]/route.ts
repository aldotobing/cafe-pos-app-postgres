import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const settingId = parseInt(id);
    const data = await request.json();

    // SECURE ISOLATION: Check if user owns this cafe or is superadmin
    if (user.role !== 'superadmin') {
      // First, fetch the current setting to verify cafe ownership
      const { data: setting, error: getError } = await supabaseAdmin
        .from('cafe_settings')
        .select('*')
        .eq('id', settingId)
        .single();

      if (getError || !setting) {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
      
      const settingCafeId = Number(setting.cafe_id);
      const userCafeId = Number(user.cafeId);
      
      console.log('[Cafe Settings PUT] Comparing:', { settingCafeId, userCafeId });
      
      if (settingCafeId !== userCafeId) {
        return NextResponse.json(
          { error: 'Forbidden: Can only update settings for your own cafe' }, 
          { status: 403 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
    if (data.tax_percent !== undefined) updateData.tax_percent = data.tax_percent;
    if (data.service_percent !== undefined) updateData.service_percent = data.service_percent;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.enable_push_notifications !== undefined) updateData.enable_push_notifications = data.enable_push_notifications;

    const { data: result, error } = await supabaseAdmin
      .from('cafe_settings')
      .update(updateData)
      .eq('id', settingId)
      .select()
      .single();
    
    if (error) {
      console.error('Cafe Settings Update Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: result, success: true });
  } catch (error: any) {
    console.error('Cafe Settings Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
