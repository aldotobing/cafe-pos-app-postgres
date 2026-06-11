import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token, password } = await request.json();

    // If access_token is provided (from email link hash), exchange it server-side
    if (access_token) {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password minimal 6 karakter.' },
          { status: 400 },
        );
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );

      // Set the session from the recovery tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || '',
      });

      if (sessionError) {
        console.error('Set session error:', sessionError.message);
        return NextResponse.json(
          { error: 'Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.' },
          { status: 401 },
        );
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.error('Update password error:', updateError.message);
        return NextResponse.json(
          { error: updateError.message || 'Gagal memperbarui password.' },
          { status: 500 },
        );
      }

      // Sign out
      await supabase.auth.signOut();

      return NextResponse.json({
        success: true,
        message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.',
      });
    }

    // Fallback: use existing session (from middleware PKCE exchange)
    // This path requires the proxy to have already set the session cookies
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 },
      );
    }

    // This path is kept for when middleware handles the exchange
    return NextResponse.json(
      { error: 'Silakan gunakan link dari email.' },
      { status: 400 },
    );
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi nanti.' },
      { status: 500 },
    );
  }
}
