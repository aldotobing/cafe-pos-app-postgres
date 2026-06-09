import { supabaseAdmin } from '@/lib/supabase-server'
import { notifyCafeAdmins } from '@/lib/notification-service-server'

export async function checkTargetAchievement(cafeId: number) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = new Date(year, month - 1, 1).toISOString()
  const monthEnd = new Date(year, month, 1).toISOString()

  const { data: target } = await supabaseAdmin
    .from('revenue_targets')
    .select('monthly_target, id')
    .eq('cafe_id', cafeId)
    .eq('target_month', month)
    .eq('target_year', year)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!target?.monthly_target || target.monthly_target <= 0) return

  const { data: revenue } = await supabaseAdmin
    .from('transactions')
    .select('total_amount')
    .eq('cafe_id', cafeId)
    .is('deleted_at', null)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)

  const totalRevenue = (revenue || []).reduce((sum: number, t: any) => sum + Number(t.total_amount || 0), 0)

  if (totalRevenue < target.monthly_target) return

  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('cafe_id', cafeId)
    .eq('type', 'target_achieved')
    .gte('created_at', monthStart)
    .limit(1)

  if (existing?.length) return

  const formatRp = (n: number) => {
    const parts = n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return 'Rp ' + parts
  }

  await supabaseAdmin.from('notifications').insert({
    cafe_id: cafeId,
    type: 'target_achieved',
    title: 'Target tercapai! 🎉',
    body: `${formatRp(totalRevenue)} telah mencapai target ${formatRp(target.monthly_target)}`,
    data: { monthly_target: target.monthly_target, total_revenue: totalRevenue },
  })
}

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
      : n.type === 'target_achieved'
        ? '/expenses'
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
