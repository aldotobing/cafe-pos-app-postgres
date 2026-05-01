import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ExpenseFormData } from '@/types/finance';
import { NextResponse } from 'next/server';

// GET /api/finance/expenses - List expenses with filters
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const cafe_id = url.searchParams.get('cafe_id');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');
    const category_id = url.searchParams.get('category_id');

    if (!cafe_id) {
      return NextResponse.json({ error: 'cafe_id is required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== parseInt(cafe_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = (supabaseAdmin as any)
      .from('expenses')
      .select(`
        *,
        category:expense_categories!category_id(name, color)
      `)
      .eq('cafe_id', cafe_id)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false });

    // Apply filters
    if (start_date) {
      query = query.gte('expense_date', start_date);
    }
    if (end_date) {
      query = query.lte('expense_date', end_date);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    // Calculate total
    const totalAmount = expenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;

    // Get unique created_by user IDs
    const userIds = [...new Set(expenses?.map((exp: any) => exp.created_by).filter(Boolean))];
    
    // Fetch user names from user_profiles if there are user IDs
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await (supabaseAdmin as any)
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      if (!profilesError && profiles) {
        userMap = profiles.reduce((acc: Record<string, string>, p: any) => {
          acc[p.user_id] = p.full_name || 'Unknown';
          return acc;
        }, {});
      }
    }

    // Merge user names with expenses
    const expensesWithCreator = expenses?.map((exp: any) => ({
      ...exp,
      created_by_name: userMap[exp.created_by] || '-'
    }));

    return NextResponse.json({
      data: expensesWithCreator || [],
      total: totalAmount,
      count: expenses?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/finance/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/finance/expenses - Create new expense
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body: ExpenseFormData & { cafe_id: number } = await request.json();
    const { cafe_id, ...expenseData } = body;

    if (!cafe_id) {
      return NextResponse.json({ error: 'cafe_id is required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== cafe_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validation
    if (!expenseData.amount || expenseData.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    if (!expenseData.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!expenseData.expense_date) {
      return NextResponse.json({ error: 'Expense date is required' }, { status: 400 });
    }

    // Insert expense with creator info
    const { data: expense, error } = await (supabaseAdmin as any)
      .from('expenses')
      .insert({
        cafe_id,
        ...expenseData,
        created_by: user.id
      })
      .select('*, category:expense_categories!category_id(name, color)')
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    // Add created_by_name to response
    const expenseWithCreator = {
      ...expense,
      created_by_name: user.fullName || user.email || 'Unknown'
    };

    return NextResponse.json({
      message: 'Expense created successfully',
      data: expenseWithCreator
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/finance/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
