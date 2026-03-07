import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usar anon client — el service role bypasea el SMTP configurado
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
    })

    // Siempre success — nunca confirmar si el email existe
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Server Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}