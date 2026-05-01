import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { RevenueTargetFormData } from '@/types/finance';
import { NextResponse } from 'next/server';

// GET /api/finance/targets - Get revenue targets
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const cafe_id = url.searchParams.get('cafe_id');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');

    if (!cafe_id) {
      return NextResponse.json({ error: 'cafe_id is required' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== parseInt(cafe_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = (supabaseAdmin as any)
      .from('revenue_targets')
      .select('*')
      .eq('cafe_id', cafe_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('target_year', { ascending: false })
      .order('target_month', { ascending: false });

    if (year) {
      query = query.eq('target_year', parseInt(year));
    }
    if (month) {
      query = query.eq('target_month', parseInt(month));
    }

    const { data: targets, error } = await query;

    if (error) {
      console.error('Error fetching revenue targets:', error);
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }

    return NextResponse.json({ data: targets || [] });

  } catch (error) {
    console.error('Error in GET /api/finance/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/finance/targets - Create or update revenue target
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body: RevenueTargetFormData & { cafe_id: number } = await request.json();
    const { cafe_id, target_month, target_year, daily_target, monthly_target, notes } = body;

    if (!cafe_id || !target_month || !target_year) {
      return NextResponse.json({ error: 'cafe_id, target_month, and target_year are required' }, { status: 400 });
    }

    if (!monthly_target || monthly_target <= 0) {
      return NextResponse.json({ error: 'Monthly target must be greater than 0' }, { status: 400 });
    }

    // Verify user has access to this cafe
    if (user.cafeId !== cafe_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if target exists for this period
    const { data: existingTarget } = await (supabaseAdmin as any)
      .from('revenue_targets')
      .select('id')
      .eq('cafe_id', cafe_id)
      .eq('target_year', target_year)
      .eq('target_month', target_month)
      .is('deleted_at', null)
      .single();

    let result;

    if (existingTarget) {
      // Update existing target
      result = await (supabaseAdmin as any)
        .from('revenue_targets')
        .update({
          daily_target: daily_target || (monthly_target / 30),
          monthly_target,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTarget.id)
        .select()
        .single();
    } else {
      // Create new target
      result = await (supabaseAdmin as any)
        .from('revenue_targets')
        .insert({
          cafe_id,
          target_month,
          target_year,
          daily_target: daily_target || (monthly_target / 30),
          monthly_target,
          notes,
          created_by: user.id
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving revenue target:', result.error);
      return NextResponse.json({ error: 'Failed to save target' }, { status: 500 });
    }

    return NextResponse.json({
      message: existingTarget ? 'Target updated successfully' : 'Target created successfully',
      data: result.data
    }, { status: existingTarget ? 200 : 201 });

  } catch (error) {
    console.error('Error in POST /api/finance/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
