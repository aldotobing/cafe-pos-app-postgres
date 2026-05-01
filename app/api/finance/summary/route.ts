import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { FinancialMetrics, ExpenseSummary } from '@/types/finance';
import { NextResponse } from 'next/server';

// GET /api/finance/summary - Get financial summary for dashboard
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const cafe_id = url.searchParams.get('cafe_id');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');

    if (!cafe_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'cafe_id, start_date, and end_date are required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== parseInt(cafe_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Get Revenue (from transactions)
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .eq('cafe_id', parseInt(cafe_id))
      .gte('created_at', start_date)
      .lt('created_at', end_date + 'T23:59:59.999Z')
      .is('deleted_at', null);

    if (revenueError) {
      console.error('Error fetching revenue:', revenueError);
    }

    const totalRevenue = revenueData?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;

    // 2. Get COGS (from transaction items with menu.hpp_price)
    const { data: cogsData, error: cogsError } = await supabaseAdmin
      .from('transaction_items')
      .select(`
        quantity,
        menu:menu_id(hpp_price)
      `)
      .eq('transactions.cafe_id', parseInt(cafe_id))
      .gte('transactions.created_at', start_date)
      .lt('transactions.created_at', end_date + 'T23:59:59.999Z')
      .is('deleted_at', null);

    // Calculate COGS
    let totalCOGS = 0;
    if (cogsData && !cogsError) {
      totalCOGS = cogsData.reduce((sum: number, item: any) => {
        const qty = item.quantity || 0;
        const hpp = item.menu?.hpp_price || 0;
        return sum + (qty * hpp);
      }, 0);
    }

    // 3. Get Expenses
    const { data: expensesData, error: expensesError } = await (supabaseAdmin as any)
      .from('expenses')
      .select(`
        amount,
        category:expense_categories!category_id(name, color)
      `)
      .eq('cafe_id', parseInt(cafe_id))
      .gte('expense_date', start_date)
      .lte('expense_date', end_date)
      .is('deleted_at', null);

    let totalExpenses = 0;
    const expensesByCategory: Record<string, ExpenseSummary> = {};

    if (expensesData && !expensesError) {
      totalExpenses = expensesData.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Group by category
      expensesData.forEach((expense: any) => {
        const category = expense.category;
        const categoryId = category?.id || 'uncategorized';
        const categoryName = category?.name || 'Uncategorized';
        const categoryColor = category?.color || '#6B7280';

        if (!expensesByCategory[categoryId]) {
          expensesByCategory[categoryId] = {
            category_id: categoryId,
            category_name: categoryName,
            category_color: categoryColor,
            total_amount: 0,
            transaction_count: 0,
            percentage: 0
          };
        }

        expensesByCategory[categoryId].total_amount += expense.amount || 0;
        expensesByCategory[categoryId].transaction_count += 1;
      });
    }

    // Calculate percentages
    const expenseSummaryArray = Object.values(expensesByCategory).map(cat => ({
      ...cat,
      percentage: totalExpenses > 0 ? Math.round((cat.total_amount / totalExpenses) * 100) : 0
    })).sort((a, b) => b.total_amount - a.total_amount);

    // 4. Get Revenue Target for the period
    const startDateObj = new Date(start_date);
    const targetMonth = startDateObj.getMonth() + 1;
    const targetYear = startDateObj.getFullYear();

    const { data: targetData, error: targetError } = await (supabaseAdmin as any)
      .from('revenue_targets')
      .select('monthly_target')
      .eq('cafe_id', cafe_id)
      .eq('target_year', targetYear)
      .eq('target_month', targetMonth)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const targetRevenue = targetData?.monthly_target || 0;
    const targetAchievement = targetRevenue > 0 ? Math.round((totalRevenue / targetRevenue) * 100) : 0;
    const targetGap = targetRevenue - totalRevenue;

    // 5. Calculate Profit Metrics
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // 6. Cash Flow
    const cashIn = totalRevenue;
    const cashOut = totalCOGS + totalExpenses;
    const netCashFlow = cashIn - cashOut;

    const financialMetrics: FinancialMetrics = {
      totalRevenue,
      targetRevenue,
      targetAchievement,
      targetGap,
      totalCOGS,
      totalExpenses,
      expensesByCategory: expenseSummaryArray,
      grossProfit,
      netProfit,
      netProfitMargin,
      cashIn,
      cashOut,
      netCashFlow
    };

    return NextResponse.json({ data: financialMetrics });

  } catch (error) {
    console.error('Error in GET /api/finance/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
