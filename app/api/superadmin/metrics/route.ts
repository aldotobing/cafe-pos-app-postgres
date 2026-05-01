import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { error } = await requireRole(request, 'superadmin');
  if (error) return error;

  try {
    // Get today's date in Asia/Jakarta timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel queries for metrics
    const [
      cafesResult,
      usersResult,
      transactionsTodayResult,
      transactionsWeekResult,
      transactionsMonthResult,
      revenueTodayResult,
      revenueWeekResult,
      revenueMonthResult,
      pendingApprovalsResult,
      onlineUsersResult
    ] = await Promise.all([
      // Total cafes
      supabaseAdmin
        .from('cafes')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Users by role
      supabaseAdmin
        .from('user_profiles')
        .select('role')
        .is('deleted_at', null),

      // Transactions count
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', today),

      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', weekAgo),

      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', monthAgo),

      // Revenue
      supabaseAdmin
        .from('transactions')
        .select('total_amount')
        .is('deleted_at', null)
        .gte('created_at', today),

      supabaseAdmin
        .from('transactions')
        .select('total_amount')
        .is('deleted_at', null)
        .gte('created_at', weekAgo),

      supabaseAdmin
        .from('transactions')
        .select('total_amount')
        .is('deleted_at', null)
        .gte('created_at', monthAgo),

      // Pending approvals
      supabaseAdmin
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_approved', false),

      // Online users (last_login < 5 minutes ago)
      supabaseAdmin
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('last_login', 'is', null)
        .gt('last_login', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    ]);

    // Calculate totals
    const totalCafes = cafesResult.count || 0;
    const users = usersResult.data || [];
    const usersByRole = {
      superadmin: users.filter(u => u.role === 'superadmin').length,
      admin: users.filter(u => u.role === 'admin').length,
      cashier: users.filter(u => u.role === 'cashier').length,
      total: users.length
    };

    const transactionsToday = transactionsTodayResult.count || 0;
    const transactionsWeek = transactionsWeekResult.count || 0;
    const transactionsMonth = transactionsMonthResult.count || 0;

    const revenueToday = revenueTodayResult.data?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const revenueWeek = revenueWeekResult.data?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const revenueMonth = revenueMonthResult.data?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const pendingApprovals = pendingApprovalsResult.count || 0;
    const onlineUsers = onlineUsersResult.count || 0;

    return NextResponse.json({
      cafes: {
        total: totalCafes
      },
      users: usersByRole,
      transactions: {
        today: transactionsToday,
        week: transactionsWeek,
        month: transactionsMonth
      },
      revenue: {
        today: revenueToday,
        week: revenueWeek,
        month: revenueMonth
      },
      approvals: {
        pending: pendingApprovals
      },
      activity: {
        online: onlineUsers
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
