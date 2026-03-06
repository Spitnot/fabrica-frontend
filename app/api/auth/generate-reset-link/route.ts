import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Server Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}