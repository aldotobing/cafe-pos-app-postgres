import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// PUT /api/finance/expenses/:id - Update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Verify user has permission
    const { data: existingExpense, error: fetchError } = await (supabaseAdmin as any)
      .from('expenses')
      .select('cafe_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Check cafe access
    if (user.cafeId !== existingExpense.cafe_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check role
    if (!['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Remove fields that shouldn't be updated
    const { id: _, cafe_id, created_by, created_at, updated_at, deleted_at, version, ...updateData } = body;

    // Update expense
    const { data: expense, error } = await (supabaseAdmin as any)
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select('*, category:expense_categories!category_id(name, color)')
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }

    // Fetch creator name
    let createdByName = '-';
    if (expense?.created_by) {
      const { data: profile } = await (supabaseAdmin as any)
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', expense.created_by)
        .single();
      createdByName = profile?.full_name || 'Unknown';
    }

    return NextResponse.json({
      message: 'Expense updated successfully',
      data: { ...expense, created_by_name: createdByName }
    });

  } catch (error) {
    console.error('Error in PUT /api/finance/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/finance/expenses/:id - Soft delete expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Verify user has permission
    const { data: existingExpense, error: fetchError } = await (supabaseAdmin as any)
      .from('expenses')
      .select('cafe_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Check cafe access
    if (user.cafeId !== existingExpense.cafe_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check role
    if (!['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete
    const { error } = await (supabaseAdmin as any)
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/finance/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
