import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { notifyCafeAdmins } from '@/lib/notification-service-server';

export async function POST(request: Request) {
  // Authentication check
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { cafeId, title, body, url, excludeUserId } = await request.json();
    
    if (!cafeId || !title || !body) {
      return NextResponse.json({ error: 'Missing required notification fields' }, { status: 400 });
    }

    // Cafe isolation: non-superadmin can only notify their own cafe
    if (user.role !== 'superadmin') {
      const targetCafeId = Number(cafeId);
      if (targetCafeId !== user.cafeId) {
        return NextResponse.json({ error: 'Forbidden: Can only notify your own cafe' }, { status: 403 });
      }
    }

    // Trigger notification in background
    notifyCafeAdmins(
      Number(cafeId),
      title,
      body,
      url || '/transactions',
      excludeUserId
    ).catch(e => console.error('Error triggering notification:', e));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification Trigger Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
