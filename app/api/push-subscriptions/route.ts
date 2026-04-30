import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Handle POST - Create/Update push subscription
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Push API] Received payload:', body);
    
    const { subscription, userId, cafeId } = body;
    console.log('[Push API] Subscription object:', subscription);
    
    // Extract keys from subscription object
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    const endpoint = subscription?.endpoint;

    if (!endpoint || !p256dh || !auth || !userId || !cafeId) {
      console.error('[Push API] Missing fields analysis:', { 
        endpoint: !!endpoint, 
        keys: subscription?.keys ? 'present' : 'missing',
        p256dh: !!p256dh, 
        auth: !!auth, 
        userId, 
        cafeId 
      });
      return NextResponse.json({ error: 'Missing required subscription fields' }, { status: 400 });
    }

    // Upsert by endpoint — each device has a unique endpoint,
    // so re-subscribing on the same device updates in place,
    // while other devices' subscriptions are preserved.
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh_key: p256dh,
          auth_key: auth,
          user_id: userId,
          cafe_id: Number(cafeId),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } as any,
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('[Push API] Push Subscription Upsert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Push API] Subscription saved for user ${userId} on endpoint ${endpoint.substring(0, 50)}...`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Push API] Push Subscription Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Handle DELETE - Remove subscription
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;
    console.log('[Push API] DELETE request body:', body);

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    // Find and delete by endpoint
    const { data: records, error: findError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .limit(1);

    if (findError || !records || records.length === 0) {
      console.log('Subscription not found, nothing to delete');
      return NextResponse.json({ success: true });
    }

    // Delete by ID
    const { error: deleteError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('id', (records[0] as any).id);

    if (deleteError) {
      console.error('Push Subscription Delete Error (ignoring):', deleteError);
      // Don't fail the request, just log it so the user can still unsubscribe locally
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push Subscription Delete Exception:', error);
    return NextResponse.json({ success: true }); // Return success to allow local unsubscribe to finish
  }
}
