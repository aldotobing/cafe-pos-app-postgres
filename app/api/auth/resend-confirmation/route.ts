import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ratelimit, getClientIP } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  // Rate limiting: 3 attempts per 5 minutes per IP
  const ip = getClientIP(request);
  const { success } = await ratelimit.auth.limit(ip);

  if (!success) {
    return NextResponse.json({
      error: "Terlalu banyak percobaan. Silakan coba lagi nanti.",
      code: "RATE_LIMITED"
    }, { status: 429 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });
    }

    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'kasirku.biz.id';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${appUrl}/login`,
      },
    });

    if (error) {
      if (error.message?.includes('captcha')) {
        return NextResponse.json(
          { error: 'Verifikasi keamanan (captcha) gagal. Muat ulang halaman dan coba lagi.' },
          { status: 400 }
        );
      }
      if (error.message?.includes('rate') || error.message?.includes('limit')) {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
          { status: 429 }
        );
      }
      // Return success anyway to prevent email enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar dan belum diverifikasi, link verifikasi telah dikirim.'
    }, { status: 200 });

  } catch (err) {
    console.error('Resend confirmation error:', err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
