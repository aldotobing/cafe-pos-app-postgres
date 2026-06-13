import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || !user.cafeId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10') || 10, 50)
  const offset = parseInt(url.searchParams.get('offset') || '0') || 0

  const { data, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('cafe_id', user.cafeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({
    notifications: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  })
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || !user.cafeId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('cafe_id', user.cafeId)
    .eq('is_read', false)
    .is('deleted_at', null)

  return NextResponse.json({ success: true })
}
