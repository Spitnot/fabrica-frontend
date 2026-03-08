import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendTeamInviteEmail } from '@/lib/emailService'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) throw error

    const adminUsers = data.users
      .filter(u => ['admin', 'manager', 'viewer'].includes(u.user_metadata?.role))
      .map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || 'No Name',
        role: u.user_metadata?.role,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }))

    return NextResponse.json({ data: adminUsers })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, full_name, role } = await req.json()

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // 1. Crear usuario
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (userError) throw userError

    // 2. Generar invite link con flujo PKCE
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
      },
    })

    if (linkError) throw linkError

    const setupLink = linkData.properties?.action_link
    if (!setupLink) {
      return NextResponse.json({ error: 'Could not generate invite link' }, { status: 500 })
    }

    // 3. Enviar email
    await sendTeamInviteEmail(email, full_name, setupLink)

    return NextResponse.json({ id: userData.user?.id }, { status: 201 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}