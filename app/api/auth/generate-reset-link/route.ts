import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Firma Rollers B2B <noreply@firmarollers.com>'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
      },
    })

    if (!linkError && linkData?.properties?.action_link) {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Reset your password — Firma Rollers B2B',
        html: `
          <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
            <h2 style="color:#D93A35">Reset Your Password</h2>
            <p>Click the button below to set a new password. This link expires in 24 hours.</p>
            <a href="${linkData.properties.action_link}"
               style="display:inline-block;padding:12px 24px;background:#D93A35;color:white;
                      text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">
              Reset Password
            </a>
            <p style="font-size:12px;color:#999">If you didn't request this, ignore this email.</p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[generate-reset-link] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
