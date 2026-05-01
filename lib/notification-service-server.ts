import webpush from 'web-push';
import { supabaseAdmin } from './supabase-server';

// Configuration - replace with your actual keys in .env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@kasirku.biz.id';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function notifyCafeAdmins(cafeId: number, title: string, body: string, url: string = '/transactions', excludeUserId?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured. Skipping notification.');
    return;
  }

  try {
    // 0. Check if push notifications are enabled for this cafe
    const { data: cafeSettings, error: settingsError } = await supabaseAdmin
      .from('cafe_settings')
      .select('enable_push_notifications')
      .eq('cafe_id', cafeId)
      .is('deleted_at', null)
      .single();

    if (settingsError) {
      console.warn(`[Push] Could not fetch cafe settings for cafe ${cafeId}:`, settingsError.message);
    }

    if (!cafeSettings?.enable_push_notifications) {
      console.log(`[Push] Notifications disabled for cafe ${cafeId}. Skipping.`);
      return;
    }

    // 1. Fetch all subscriptions for this cafe
    const { data: allSubscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('cafe_id', cafeId)
      .is('deleted_at', null);

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError.message);
      return;
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      console.log(`[Push] No subscriptions found for cafe ${cafeId}.`);
      return;
    }

    console.log(`[Push] Found ${allSubscriptions.length} subscription(s) for cafe ${cafeId}`);

    // 2. Fetch all admin users for this cafe
    const { data: users, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role')
      .eq('cafe_id', cafeId)
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (userError) {
      console.error('[Push] Error fetching admin users:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log(`[Push] No admin users found for cafe ${cafeId}.`);
      return;
    }
    
    const adminUserIds = new Set(
      users
        .filter((u: any) => u.user_id !== excludeUserId)
        .map((u: any) => u.user_id)
    );

    // 3. Filter subscriptions to only include those belonging to admins
    const adminSubscriptions = allSubscriptions.filter((sub: any) => adminUserIds.has(sub.user_id));

    if (adminSubscriptions.length === 0) {
      console.log(`[Push] No admin subscriptions to notify (${users.length} admins, ${allSubscriptions.length} subs, excludeUserId: ${excludeUserId}).`);
      return;
    }

    console.log(`[Push] Sending to ${adminSubscriptions.length} admin subscription(s)...`);
    
    const notificationPayload = JSON.stringify({
      title,
      body,
      url
    });

    const sendPromises = adminSubscriptions.map(async (sub: any) => {
      // Reconstruct the push subscription object web-push expects
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        console.log(`[Push] ✓ Sent to user ${sub.user_id}`);
      } catch (error: any) {
        // If the subscription is no longer valid (e.g., expired or user revoked permission)
        // we should remove it from the database
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`[Push] Removing expired subscription for user ${sub.user_id}`);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`[Push] Error sending to user ${sub.user_id}:`, error.statusCode, error.body);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log('[Push] All notifications processed.');
  } catch (error) {
    console.error('[Push] Error in notifyCafeAdmins:', error);
  }
}

export async function notifyAllUsers(title: string, body: string, url: string = '/') {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured. Skipping global broadcast.');
    return;
  }

  try {
    // Fetch all active subscriptions across the platform
    const { data: allSubscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .is('deleted_at', null);

    if (subError) {
      console.error('[Push] Error fetching all subscriptions:', subError.message);
      return;
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      console.log(`[Push] No subscriptions found for global broadcast.`);
      return;
    }

    console.log(`[Push] Broadcasting to ${allSubscriptions.length} subscription(s)...`);
    
    const notificationPayload = JSON.stringify({
      title,
      body,
      url
    });

    const sendPromises = allSubscriptions.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log('[Push] Global broadcast completed.');
  } catch (error) {
    console.error('[Push] Error in notifyAllUsers:', error);
  }
}
