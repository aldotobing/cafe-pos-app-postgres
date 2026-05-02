import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // Authentication check menggunakan Supabase
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    // 1. Create the cafe
    const { data: cafe, error: cafeError } = await supabaseAdmin
      .from('cafes')
      .insert({
        owner_user_id: user.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
      })
      .select()
      .single();

    if (cafeError) {
      console.error('[Cafe Creation] Error:', cafeError);
      throw new Error(`Failed to create cafe: ${cafeError.message}`);
    }

    // 2. Create default settings
    const { error: settingsError } = await supabaseAdmin
      .from('cafe_settings')
      .insert({
        cafe_id: cafe.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
        tax_percent: 10,
        service_percent: 5,
        currency: 'IDR',
        enable_push_notifications: false,
      });

    if (settingsError) {
      console.error('[Cafe Settings Creation] Error:', settingsError);
      // Don't throw, cafe is already created
    }

    // 3. Update user profile dengan cafe_id
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ cafe_id: cafe.id })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('[User Profile Update] Error:', profileError);
      // Don't throw
    }

    // 4. Create default expense categories (setelah user profile punya cafe_id)
    // Using supabaseAdmin (service role) to bypass RLS policies
    const defaultCategories = [
      { name: 'Gaji Karyawan', color: '#EF4444', description: 'Gaji dan tunjangan karyawan', sort_order: 1 },
      { name: 'Sewa Tempat', color: '#F97316', description: 'Biaya sewa lokasi cafe', sort_order: 2 },
      { name: 'Listrik & Air', color: '#F59E0B', description: 'Tagihan listrik dan air', sort_order: 3 },
      { name: 'Bahan Baku', color: '#10B981', description: 'Bahan baku untuk produksi', sort_order: 4 },
      { name: 'Perlengkapan', color: '#3B82F6', description: 'Alat dan perlengkapan operasional', sort_order: 5 },
      { name: 'Marketing', color: '#8B5CF6', description: 'Biaya promosi dan marketing', sort_order: 6 },
      { name: 'Perbaikan', color: '#EC4899', description: 'Biaya perbaikan dan maintenance', sort_order: 7 },
      { name: 'Transportasi', color: '#6366F1', description: 'Biaya transportasi dan pengiriman', sort_order: 8 },
      { name: 'Lainnya', color: '#6B7280', description: 'Pengeluaran lainnya', sort_order: 99 },
    ];

    try {
      const { data: insertedCategories, error: categoriesError } = await (supabaseAdmin as any)
        .from('expense_categories')
        .insert(
          defaultCategories.map(cat => ({
            cafe_id: cafe.id,
            name: cat.name,
            color: cat.color,
            description: cat.description,
            is_active: true,
            sort_order: cat.sort_order,
          }))
        )
        .select();

      if (categoriesError) {
        console.error('[Expense Categories Creation] Error:', categoriesError);
        console.error('[Expense Categories Creation] Cafe ID:', cafe.id);
      } else {
        console.log('[Expense Categories Creation] Success:', insertedCategories?.length || 0, 'categories created for cafe', cafe.id);
      }
    } catch (err) {
      console.error('[Expense Categories Creation] Exception:', err);
    }

    return NextResponse.json({ 
      success: true, 
      cafeId: cafe.id,
      cafe: {
        id: cafe.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
      }
    });
  } catch (error: any) {
    console.error('Cafe Creation Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}

// GET /api/cafes - List cafes untuk user
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let query = supabaseAdmin
      .from('cafes')
      .select('*, cafe_settings(*)')
      .is('deleted_at', null);

    // Non-superadmin hanya lihat cafe mereka
    if (user.role !== 'superadmin') {
      query = query.eq('owner_user_id', user.id);
    }

    const { data: cafes, error } = await query;

    if (error) {
      console.error('[Cafes GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      cafes: cafes || []
    });
  } catch (error: any) {
    console.error('Cafes GET Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
