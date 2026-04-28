import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ratelimit, getClientIP } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  // Rate limiting: 5 attempts per 15 minutes per IP
  const ip = getClientIP(request);
  const { success, limit, remaining, reset } = await ratelimit.auth.limit(ip);
  
  if (!success) {
    return NextResponse.json({ 
      error: "Terlalu banyak percobaan. Silakan coba lagi nanti.",
      code: "RATE_LIMITED",
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    });
  }

  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Lengkapi semua kolom yang diperlukan" }, {
        status: 400,
      });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, {
        status: 400,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, {
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Sign up dengan Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'admin',
          is_approved: false,
        }
      }
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || 
          error.message.toLowerCase().includes('email')) {
        return NextResponse.json(
          { error: "Email sudah terdaftar. Silakan login atau gunakan email lain.", code: "DUPLICATE_EMAIL" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Gagal membuat akun", code: "SERVER_ERROR" },
        { status: 400 }
      );
    }

    // Create user profile using admin client (bypass RLS since user not yet authenticated)
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          role: 'admin',
          is_approved: false,
          is_active: true,
          trial_start_date: new Date().toISOString().split('T')[0],
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the signup, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Akun berhasil dibuat. Silakan tunggu approval dari admin.',
      user: data.user 
    }, { status: 200 });

  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
