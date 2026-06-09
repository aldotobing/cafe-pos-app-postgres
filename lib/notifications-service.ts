import { supabaseAdmin } from '@/lib/supabase-server'
import { notifyCafeAdmins } from '@/lib/notification-service-server'

export async function processPendingNotifications() {
  const { data: pending } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('is_pushed', false)
    .is('deleted_at', null)
    .limit(20)

  if (!pending?.length) return

  for (const n of pending) {
    const url = n.type === 'new_transaction'
      ? `/transactions`
      : n.type === 'trial_expiring'
        ? '/settings'
        : '/stock'

    await notifyCafeAdmins(n.cafe_id, n.title, n.body, url)

    await supabaseAdmin
      .from('notifications')
      .update({ is_pushed: true })
      .eq('id', n.id)
  }
}

export async function insertTrialExpiryNotification(cafeId: number, daysLeft: number) {
  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('cafe_id', cafeId)
    .eq('type', 'trial_expiring')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)

  if (existing?.length) return

  await supabaseAdmin.from('notifications').insert({
    cafe_id: cafeId,
    type: 'trial_expiring',
    title: 'Masa uji coba akan berakhir',
    body: `${daysLeft} hari tersisa. Upgrade untuk melanjutkan.`,
    data: { days_left: daysLeft },
  })
}
