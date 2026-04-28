import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const transactionId = url.searchParams.get('transaction_id');
    
    let query = supabaseAdmin
      .from('transaction_items')
      .select('*, transactions!inner(cafe_id)')
      .is('deleted_at', null);

    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }

    // SECURE ISOLATION
    if (user.role !== 'superadmin') {
      if (!user.cafeId) {
        return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
      }
      query = query.eq('transactions.cafe_id', user.cafeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Transaction Items GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Transaction Items GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('transaction_items')
      .insert({
        transaction_id: body.transaction_id,
        menu_id: body.menu_id,
        menu_name: body.menu_name,
        variant_id: body.variant_id,
        variant_name: body.variant_name,
        price: body.price,
        quantity: body.quantity,
        discount: body.discount || 0,
        note: body.note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Transaction Items POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Transaction Items POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
