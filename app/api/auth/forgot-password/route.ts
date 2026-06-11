import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ratelimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const { success } = await ratelimit.auth.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan coba lagi nanti.' },
        { status: 429 },
      );
    }

    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Masukkan alamat email yang valid.' },
        { status: 400 },
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://kasirku.biz.id';

    // Use a plain client with anon key — resetPasswordForEmail doesn't need admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // Always return success — don't leak whether email exists
    if (error) {
      console.error('Reset password error:', error.message);
    }

    return NextResponse.json({
      success: true,
      message:
        'Link reset password telah dikirim. Silakan periksa kotak masuk email Anda.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi nanti.' },
      { status: 500 },
    );
  }
}
