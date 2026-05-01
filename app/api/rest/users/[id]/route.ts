import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'superadmin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: userId } = await params;
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*, cafes(id, name)')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('User GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const targetUserId = (await params).id;
    const body = await request.json();

    // Superadmin can update any user
    // Admin can only update users (cashiers) in their own cafe
    if (user.role !== 'superadmin') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
      }

      // Get the target user to check cafe_id
      const { data: targetUser, error: getError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (getError || !targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Admin can only modify users in their own cafe
      if (targetUser?.cafe_id !== user.cafeId) {
        return NextResponse.json({ error: "Forbidden: Can only modify users in your own cafe" }, { status: 403 });
      }

      // Admin can only update is_active field (not other sensitive fields)
      const allowedFields = ['is_active'];
      const requestedFields = Object.keys(body);
      const hasDisallowedFields = requestedFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json({ error: "Forbidden: Can only update is_active field" }, { status: 403 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_approved !== undefined) updateData.is_approved = body.is_approved;
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.role !== undefined && user.role === 'superadmin') updateData.role = body.role;
    if (body.cafe_id !== undefined && user.role === 'superadmin') updateData.cafe_id = body.cafe_id;
    if (body.trial_end_date !== undefined && user.role === 'superadmin') updateData.trial_end_date = body.trial_end_date;

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) {
      console.error('User PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('User PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'superadmin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: targetUserId } = await params;

    // Soft delete dengan set deleted_at
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', targetUserId);

    if (error) {
      console.error('User DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('User DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
