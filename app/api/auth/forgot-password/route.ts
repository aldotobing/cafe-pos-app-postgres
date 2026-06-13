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

    const { email, captchaToken } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Masukkan alamat email yang valid.' },
        { status: 400 },
      );
    }

    // ALWAYS use production URL for redirectTo.
    // HTTPS→HTTP redirects strip the URL hash (security policy), losing the tokens.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kasirku.biz.id';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
      captchaToken: captchaToken || undefined,
    });

    if (error) {
      console.error('Reset password error:', error.message, error.status);

      if (error.message.includes('captcha')) {
        return NextResponse.json(
          { error: 'Verifikasi keamanan (captcha) gagal. Muat ulang halaman dan coba lagi.' },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: 'Gagal mengirim email reset. Pastikan alamat email terdaftar.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Link reset password telah dikirim. Silakan periksa kotak masuk email Anda.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi nanti.' },
      { status: 500 },
    );
  }
}
