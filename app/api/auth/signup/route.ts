import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ratelimit, getClientIP } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getJakartaNow } from "@/lib/format";

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
    const { email, password, fullName, captchaToken } = await request.json();

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

    // Sign up dengan Supabase Auth — email confirmation replaces manual approval
    // Build redirect URL using origin from request (works in dev & production)
    const origin = new URL(request.url).origin;
    const redirectUrl = `${origin}/login`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        captchaToken: captchaToken || undefined,
        data: {
          full_name: fullName,
          role: 'admin',
          is_approved: true,
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
      if (error.message.toLowerCase().includes('captcha')) {
        return NextResponse.json(
          { error: "Verifikasi keamanan (captcha) gagal. Silakan muat ulang halaman dan coba lagi.", code: "CAPTCHA_FAILED" },
          { status: 400 }
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
          is_approved: true,
          is_active: true,
          trial_start_date: getJakartaNow().split(' ')[0],
          trial_end_date: new Date(new Date().getTime() + 7 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the signup, just log the error
      }
    }

    // Check if email confirmation was sent
    const emailSent = data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at == null;

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi sebelum login.'
        : 'Akun berhasil dibuat. Silakan login.',
      emailVerificationSent: emailSent,
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
