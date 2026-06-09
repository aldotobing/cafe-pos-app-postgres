import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || !user.cafeId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('cafe_id', user.cafeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ notifications: data || [] })
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
