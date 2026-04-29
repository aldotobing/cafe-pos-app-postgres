import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  
  // SECURE ISOLATION: Filter transactions by cafeId
  let cafeId = user.cafeId;
  if (user.role === 'superadmin') {
    const requestedCafeId = url.searchParams.get('cafe_id');
    cafeId = requestedCafeId ? parseInt(requestedCafeId) : user.cafeId;
  }
  
  if (!cafeId) {
    return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
  }
  
  try {
    // Date range filters
    const createdAtGte = url.searchParams.get('created_at_gte');
    const createdAtLt = url.searchParams.get('created_at_lt');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Build filter conditions for reuse
    const fromDate = createdAtGte || startDate;
    const toDate = createdAtLt || endDate;

    // Query 1: Get paginated data with items
    let dataQuery = supabaseAdmin
      .from('transactions')
      .select('*, transaction_items(*)', { count: 'exact' })
      .eq('cafe_id', cafeId)
      .is('deleted_at', null);

    if (fromDate) {
      dataQuery = dataQuery.gte('created_at', fromDate);
    }
    if (toDate) {
      dataQuery = dataQuery.lt('created_at', toDate);
    }

    const { data: transactions, error, count } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Transactions GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Query 2: Get total amount for ALL filtered transactions
    let summaryQuery = supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .eq('cafe_id', cafeId)
      .is('deleted_at', null);

    if (fromDate) {
      summaryQuery = summaryQuery.gte('created_at', fromDate);
    }
    if (toDate) {
      summaryQuery = summaryQuery.lt('created_at', toDate);
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    const totalAmount = summaryError || !summaryData 
      ? 0 
      : summaryData.reduce((sum: number, t: any) => sum + (parseFloat(t.total_amount) || 0), 0);

    return NextResponse.json({
      data: transactions || [],
      meta: { 
        total: count, 
        limit, 
        offset,
        totalAmount  // Total amount of ALL filtered transactions
      }
    });
  } catch (error: any) {
    console.error('Transactions GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    // SECURE ISOLATION: Enforce cafe ownership for new transactions
    let cafeId = user.cafeId;
    if (user.role === 'superadmin') {
      cafeId = body.cafe_id || user.cafeId;
    }
    
    if (!cafeId) {
      return NextResponse.json({ error: "Unauthorized: No cafe assigned" }, { status: 403 });
    }

    // Generate transaction number menggunakan function
    const { data: txnNumber, error: txnError } = await supabaseAdmin
      .rpc('generate_transaction_number');
    
    if (txnError) {
      console.error('Generate transaction number error:', txnError);
    }

    // Create transaction
    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        transaction_number: txnNumber || `TXN-${Date.now()}`,
        cafe_id: cafeId,
        created_by: user.id,
        cashier_name: user.fullName || user.email,
        subtotal: body.subtotal || 0,
        tax_amount: body.tax_amount || 0,
        service_charge: body.service_charge || 0,
        total_amount: body.total_amount || 0,
        payment_method: body.payment_method || 'Tunai',
        payment_amount: body.payment_amount || 0,
        change_amount: body.change_amount || 0,
        order_note: body.order_note,
      })
      .select()
      .single();

    if (error) {
      console.error('Transaction POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert transaction items jika ada
    if (body.items && body.items.length > 0 && transaction) {
      const itemsToInsert = body.items.map((item: any) => ({
        transaction_id: transaction.id,
        menu_id: item.menu_id || item.menuId,
        menu_name: item.menu_name || item.name || item.menuName,
        variant_id: item.variant_id || item.variantId,
        variant_name: item.variant_name || item.variantName,
        price: item.price,
        quantity: item.quantity || item.qty,
        discount: item.discount || 0,
        note: item.note,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('transaction_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Transaction items insert error:', itemsError);
      }

      // Update stock jika item track_stock
      for (const item of body.items) {
        const itemMenuId = item.menu_id || item.menuId;
        const itemVariantId = item.variant_id || item.variantId;
        
        if (itemMenuId) {
          // Get menu item with hpp_price
          const { data: menuItem } = await supabaseAdmin
            .from('menu')
            .select('track_stock, stock_quantity, hpp_price')
            .eq('id', itemMenuId)
            .single();

          if (menuItem?.track_stock) {
            let hppPrice = menuItem.hpp_price;
            
            // If variant, get variant hpp_price
            if (itemVariantId) {
              const { data: variant } = await supabaseAdmin
                .from('product_variants')
                .select('hpp_price, track_stock')
                .eq('id', itemVariantId)
                .single();
              if (variant?.track_stock) {
                hppPrice = variant.hpp_price || hppPrice;
              }
            }
            
            // Create stock mutation with hpp_price
            await supabaseAdmin
              .from('stock_mutations')
              .insert({
                menu_id: itemMenuId,
                cafe_id: cafeId,
                variant_id: itemVariantId,
                type: 'out',
                quantity: -(item.quantity || item.qty || 1),
                hpp_price: hppPrice,
                reference_type: 'transaction',
                reference_id: transaction.id,
                notes: `Transaction ${transaction.transaction_number}`,
                created_by: user.id,
              });
          }
        }
      }
    }

    return NextResponse.json({ data: transaction, success: true }, { status: 201 });

  } catch (error: any) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
