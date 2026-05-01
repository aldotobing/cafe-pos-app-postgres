import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
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

    // Trigger background process
    try {
      await notifyAllUsers(title, body, url || '/dashboard');
    } catch (e) {
      console.error('[Broadcast API] Error triggering broadcast:', e);
    }

    return NextResponse.json({ success: true, message: 'Broadcast sent successfully' });
  } catch (error) {
    console.error('[Broadcast API] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
