import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    
    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check cafe access untuk non-superadmin
    if (user.role !== 'superadmin' && transaction.cafe_id !== user.cafeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error('Transaction GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/superadmin can update transactions
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object
    const updateData: any = {};
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method;
    if (body.payment_amount !== undefined) updateData.payment_amount = body.payment_amount;
    if (body.change_amount !== undefined) updateData.change_amount = body.change_amount;
    if (body.order_note !== undefined) updateData.order_note = body.order_note;

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Transaction PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Transaction PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/superadmin can delete transactions
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Transaction DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin, superadmin, and cashier can void transactions
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'cashier') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { data: tx, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (tx.status === 'voided') {
      return NextResponse.json({ error: "Transaction already voided" }, { status: 409 });
    }

    if (user.role !== 'superadmin' && tx.cafe_id !== user.cafeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow cashiers to void their own transactions
    if (user.role === 'cashier' && tx.created_by !== user.id) {
      return NextResponse.json({ error: "Kasir hanya dapat membatalkan transaksi miliknya sendiri" }, { status: 403 });
    }

    const { reason } = await request.json().catch(() => ({ reason: '' }));

    const reversalMutations = await Promise.all(
      (tx.transaction_items || []).map(async (item: any) => {
        const menuId = item.menu_id;
        if (!menuId) return null;

        const { data: menuItem } = await supabaseAdmin
          .from('menu')
          .select('track_stock')
          .eq('id', menuId)
          .single();

        let shouldTrack = !!menuItem?.track_stock;

        if (item.variant_id) {
          const { data: variant } = await supabaseAdmin
            .from('product_variants')
            .select('track_stock')
            .eq('id', item.variant_id)
            .single();
          if (variant) {
            shouldTrack = shouldTrack || variant.track_stock === true;
          }
        }

        if (!shouldTrack) return null;

        return supabaseAdmin
          .from('stock_mutations')
          .insert({
            menu_id: menuId,
            cafe_id: tx.cafe_id,
            variant_id: item.variant_id || null,
            type: 'in',
            quantity: item.quantity,
            reference_type: 'void',
            reference_id: tx.id,
            notes: `Pembatalan: ${tx.transaction_number} (${reason || 'Tanpa alasan'})`,
            created_by: user.id,
          });
      })
    );

    const reversalErrors = reversalMutations.filter(r => r && r.error);
    if (reversalErrors.length > 0) {
      console.error('Void stock reversal errors:', reversalErrors.map(r => r!.error));
    }

    const now = new Date().toISOString();
    const { data: voided, error: voidErr } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'voided',
        voided_at: now,
        void_reason: reason || null,
        voided_by: user.id,
      })
      .eq('id', id)
      .select('*, transaction_items(*)')
      .single();

    if (voidErr) {
      console.error('Void error:', voidErr);
      return NextResponse.json({ error: voidErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: voided });
  } catch (error: any) {
    console.error('Void PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
