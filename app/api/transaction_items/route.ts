import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    console.error('Transaction Items Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
