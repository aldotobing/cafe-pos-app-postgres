import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/finance/categories - List expense categories
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const cafe_id = url.searchParams.get('cafe_id');

    if (!cafe_id) {
      return NextResponse.json({ error: 'cafe_id is required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== parseInt(cafe_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get categories
    const { data: categories, error } = await (supabaseAdmin as any)
      .from('expense_categories')
      .select('*')
      .eq('cafe_id', cafe_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ data: categories || [] });

  } catch (error) {
    console.error('Error in GET /api/finance/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/finance/categories - Create new category
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { cafe_id, name, color, description, sort_order } = body;

    if (!cafe_id || !name) {
      return NextResponse.json({ error: 'cafe_id and name are required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== cafe_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Insert category
    const { data: category, error } = await (supabaseAdmin as any)
      .from('expense_categories')
      .insert({
        cafe_id,
        name,
        color: color || '#6B7280',
        description,
        sort_order: sort_order || 0,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating expense category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Category created successfully',
      data: category
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/finance/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
