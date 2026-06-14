import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { processPendingNotifications, checkTargetAchievement } from "@/lib/notifications-service";

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
    const createdBy = url.searchParams.get('created_by');
    const paymentMethod = url.searchParams.get('payment_method');
    const search = url.searchParams.get('search');

    // Sanitize search term for ILIKE: escape special wildcard chars, wrap with %%
    const rawTerm = search?.trim();
    const searchPattern = rawTerm
      ? `%${rawTerm.replace(/[%_]/g, '\\$&')}%`
      : null;

    // If searching, also find matching transactions via item names
    let itemMatchIds: string[] | null = null;
    if (searchPattern) {
      const { data: matchingItems } = await supabaseAdmin
        .from('transaction_items')
        .select('transaction_id')
        .ilike('menu_name', searchPattern)
        .limit(500);
      itemMatchIds = matchingItems?.length
        ? [...new Set(matchingItems.map((i: any) => i.transaction_id))]
        : [];
    }

    // Build combined search filter: main table fields + matched item IDs
    const buildSearchOr = (pattern: string, itemIds: string[] | null) => {
      const parts = [
        `transaction_number.ilike.${pattern}`,
        `cashier_name.ilike.${pattern}`,
      ];
      if (itemIds && itemIds.length > 0) {
        parts.push(`id.in.(${itemIds.join(',')})`);
      }
      return parts.join(',');
    };

    // Build filter conditions for reuse
    const fromDate = createdAtGte || startDate;
    const toDate = createdAtLt || endDate;

    // Status filter: default to all, accept 'completed' or 'voided'
    const statusFilter = url.searchParams.get('status') || 'all';

    // Query 1: Get data with items (paginated or all if limit=-1)
    let dataQuery = supabaseAdmin
      .from('transactions')
      .select('*, transaction_items(*)', { count: 'exact' })
      .eq('cafe_id', cafeId)
      .is('deleted_at', null);

    if (statusFilter === 'completed') {
      dataQuery = dataQuery.eq('status', 'completed');
    } else if (statusFilter === 'voided') {
      dataQuery = dataQuery.eq('status', 'voided');
    }
    // 'all' means no status filter

    if (fromDate) {
      dataQuery = dataQuery.gte('created_at', fromDate);
    }
    if (toDate) {
      dataQuery = dataQuery.lt('created_at', toDate);
    }
    if (createdBy && createdBy !== 'Semua') {
      dataQuery = dataQuery.eq('created_by', createdBy);
    }
    if (paymentMethod && paymentMethod !== 'Semua') {
      dataQuery = dataQuery.eq('payment_method', paymentMethod as "Tunai" | "QRIS" | "Debit" | "Transfer");
    }
    if (searchPattern) {
      dataQuery = dataQuery.or(buildSearchOr(searchPattern, itemMatchIds));
    }

    // Apply pagination with safe upper bound
    // limit = 0 means use default (10)
    // limit > 1000 capped at 1000 to protect DB performance
    const safeLimit = limit > 0 ? Math.min(limit, 1000) : 10;
    dataQuery = dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    const { data: transactions, error, count } = await dataQuery;

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

    if (statusFilter === 'completed') {
      summaryQuery = summaryQuery.eq('status', 'completed');
    } else if (statusFilter === 'voided') {
      summaryQuery = summaryQuery.eq('status', 'voided');
    }

    if (fromDate) {
      summaryQuery = summaryQuery.gte('created_at', fromDate);
    }
    if (toDate) {
      summaryQuery = summaryQuery.lt('created_at', toDate);
    }
    if (createdBy && createdBy !== 'Semua') {
      summaryQuery = summaryQuery.eq('created_by', createdBy);
    }
    if (paymentMethod && paymentMethod !== 'Semua') {
      summaryQuery = summaryQuery.eq('payment_method', paymentMethod as "Tunai" | "QRIS" | "Debit" | "Transfer");
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      summaryQuery = summaryQuery.or(`transaction_number.ilike.${term},cashier_name.ilike.${term}`);
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    const totalAmount = summaryError || !summaryData
      ? 0
      : summaryData.reduce((sum: number, t: any) => sum + (parseFloat(t.total_amount) || 0), 0);

    // Always compute completed-only total for the summary card
    let completedTotalQuery = supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .eq('cafe_id', cafeId)
      .eq('status', 'completed')
      .is('deleted_at', null);

    if (fromDate) completedTotalQuery = completedTotalQuery.gte('created_at', fromDate);
    if (toDate) completedTotalQuery = completedTotalQuery.lt('created_at', toDate);
    if (createdBy && createdBy !== 'Semua') completedTotalQuery = completedTotalQuery.eq('created_by', createdBy);
    if (paymentMethod && paymentMethod !== 'Semua') completedTotalQuery = completedTotalQuery.eq('payment_method', paymentMethod as any);
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      completedTotalQuery = completedTotalQuery.or(`transaction_number.ilike.${term},cashier_name.ilike.${term}`);
    }

    const { data: completedData } = await completedTotalQuery;
    const completedTotal = (completedData || []).reduce((sum: number, t: any) => sum + (parseFloat(t.total_amount) || 0), 0);

    return NextResponse.json({
      data: transactions || [],
      meta: {
        total: count,
        limit,
        offset,
        totalAmount,
        completedTotal,
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

    // Idempotency check: if the client retries after a timeout, the previous
    // request may have succeeded. Return the existing transaction instead of
    // creating a duplicate.
    if (body.idempotency_key) {
      const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('idempotency_key', body.idempotency_key)
        .is('deleted_at', null)
        .maybeSingle();

      if (!lookupErr && existing) {
        return NextResponse.json({
          data: existing,
          success: true,
          existing: true,
        }, { status: 200 });
      }
    }

    // Generate transaction number — scoped per cafe
    const { data: txnNumber, error: txnError } = await supabaseAdmin
      .rpc('generate_transaction_number', { p_cafe_id: cafeId } as any);

    if (txnError) {
      console.error('Generate transaction number error:', txnError);
    }

    // Create transaction
    const insertPayload: Record<string, unknown> = {
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
      discount_type: body.discount_type || 'none',
      discount_value: body.discount_value || 0,
      discount_amount: body.discount_amount || 0,
      discount_name: body.discount_name || null,
    };
    if (body.idempotency_key) insertPayload.idempotency_key = body.idempotency_key;

    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Transaction POST error:', error);
      // 23505 = unique violation. If idempotency_key collided (race condition),
      // re-fetch the already-inserted row and return it.
      if (error.code === '23505') {
        if (body.idempotency_key) {
          const { data: raceExisting } = await supabaseAdmin
            .from('transactions')
            .select('*, transaction_items(*)')
            .eq('idempotency_key', body.idempotency_key)
            .is('deleted_at', null)
            .maybeSingle();
          if (raceExisting) {
            return NextResponse.json({
              data: raceExisting,
              success: true,
              existing: true,
            }, { status: 200 });
          }
        }
        return NextResponse.json({
          error: 'Nomor transaksi bentrok (duplikat). Silakan coba lagi.',
          retry: true,
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Gagal menyimpan transaksi. Silakan coba lagi.' }, { status: 500 });
    }

    let transactionItems: any[] = [];

    if (body.items && body.items.length > 0 && transaction) {
      transactionItems = body.items.map((item: any) => ({
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
        .insert(transactionItems);

      if (itemsError) {
        console.error('Transaction items insert error:', itemsError);
      }

      // Batch-fetch menu and variant data to avoid N+1 per-item queries
      const menuIds = [...new Set(body.items.map((item: any) => item.menu_id || item.menuId).filter(Boolean))] as string[];
      const variantIds = [...new Set(body.items.map((item: any) => item.variant_id || item.variantId).filter(Boolean))] as string[];

      const [menuResult, variantResult] = await Promise.all([
        menuIds.length > 0
          ? supabaseAdmin.from('menu').select('id, track_stock, hpp_price').in('id', menuIds)
          : Promise.resolve({ data: [] }),
        variantIds.length > 0
          ? supabaseAdmin.from('product_variants').select('id, hpp_price, track_stock').in('id', variantIds)
          : Promise.resolve({ data: [] }),
      ]);

      const menuMap = new Map((menuResult.data || []).map((m: any) => [m.id, m]));
      const variantMap = new Map((variantResult.data || []).map((v: any) => [v.id, v]));

      const stockMutations = await Promise.all(
        body.items.map(async (item: any) => {
          const itemMenuId = item.menu_id || item.menuId;
          const itemVariantId = item.variant_id || item.variantId;

          if (!itemMenuId) return null;

          const menuItem = menuMap.get(itemMenuId);
          let hppPrice = menuItem?.hpp_price || 0;
          let shouldTrack = !!menuItem?.track_stock;

          if (itemVariantId) {
            const variant = variantMap.get(itemVariantId);
            if (variant) {
              shouldTrack = variant.track_stock === true ? true : shouldTrack;
              if (shouldTrack) {
                hppPrice = variant.hpp_price || hppPrice;
              }
            }
          }

          if (!shouldTrack) return null;

          return supabaseAdmin
            .from('stock_mutations')
            .insert({
              menu_id: itemMenuId,
              cafe_id: cafeId,
              variant_id: itemVariantId || null,
              type: 'out',
              quantity: -(item.quantity || item.qty || 1),
              hpp_price: hppPrice,
              reference_type: 'transaction',
              reference_id: transaction.id,
              notes: `Transaction ${transaction.transaction_number}`,
              created_by: user.id,
            });
        })
      );

      const stockErrors = stockMutations.filter((r) => r && r.error);
      if (stockErrors.length > 0) {
        console.error('Stock mutation errors:', stockErrors.map((r) => r!.error));
      }
    }

    try {
      await checkTargetAchievement(cafeId!)
      await processPendingNotifications()
    } catch (err) {
      console.error('[Target] notification error:', err)
    }

    return NextResponse.json({
      data: { ...transaction, transaction_items: transactionItems },
      success: true
    }, { status: 201 });

  } catch (error: any) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
