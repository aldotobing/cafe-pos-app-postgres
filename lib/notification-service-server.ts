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
    console.warn('VAPID keys not configured. Skipping notification.');
    return;
  }

  try {
    // 1. Fetch all subscriptions for this cafe
    const { data: allSubscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('cafe_id', cafeId);

    if (subError || !allSubscriptions || allSubscriptions.length === 0) return;

    // 2. Fetch all users for this cafe to check roles
    const { data: users, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role')
      .eq('cafe_id', cafeId)
      .eq('role', 'admin');

    if (userError || !users || users.length === 0) return;
    
    const adminUserIds = new Set(
      users
        .filter((u: any) => u.user_id !== excludeUserId)
        .map((u: any) => u.user_id)
    );

    // 3. Filter subscriptions to only include those belonging to admins
    const adminSubscriptions = allSubscriptions.filter((sub: any) => adminUserIds.has(sub.user_id));

    if (adminSubscriptions.length === 0) return;
    
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
      } catch (error: any) {
        // If the subscription is no longer valid (e.g., expired or user revoked permission)
        // we should remove it from the database
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Removing expired subscription for user ${sub.user_id}`);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error('Push notification error:', error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error in notifyCafeAdmins:', error);
  }
}
