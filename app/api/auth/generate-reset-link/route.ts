import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendResetPasswordEmail } from '@/lib/emailService'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (error) {
      console.error('Generate Link Error:', error)
      // Genérico para evitar email enumeration
      return NextResponse.json({ success: true })
    }

    const link = data.properties?.action_link

    if (link) {
      await sendResetPasswordEmail(email, link)
    }

    // Siempre responder success — nunca confirmar si el email existe
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Server Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}