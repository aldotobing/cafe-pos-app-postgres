import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Sign out dari Supabase
    await supabase.auth.signOut()
    
    // Clear cookies
    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? '; Secure' : ''
    
    const response = NextResponse.json({ success: true })
    
    // Clear access token cookie
    response.headers.set(
      'Set-Cookie',
      `sb-access-token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`
    )
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true }) // Still return success even if error
  }
}
