import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { notifyAllUsers } from '@/lib/notification-service-server';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, body, url } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // 1. Insert in-app notification for every active cafe
    const { data: cafes } = await supabaseAdmin
      .from('cafes')
      .select('id')
      .is('deleted_at', null);

    if (cafes?.length) {
      const notifications = cafes.map(c => ({
        cafe_id: c.id,
        type: 'broadcast',
        title,
        body,
        data: { url: url || '/dashboard' },
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    // 2. Send push notification to all subscribed users
    await notifyAllUsers(title, body, url || '/dashboard');

    return NextResponse.json({ success: true, message: 'Broadcast sent successfully' });
  } catch (error) {
    console.error('[Broadcast API] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
