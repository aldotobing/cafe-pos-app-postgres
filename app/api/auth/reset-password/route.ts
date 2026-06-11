import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Verify user has a valid session (from the reset password link)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.' },
        { status: 401 },
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Update password error:', error.message);
      return NextResponse.json(
        { error: 'Gagal memperbarui password. Silakan coba lagi.' },
        { status: 500 },
      );
    }

    // Sign out after password reset so user must log in with new password
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi nanti.' },
      { status: 500 },
    );
  }
}
