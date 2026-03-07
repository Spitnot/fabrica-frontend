import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerInviteEmail } from '@/lib/emailService'

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    const { data: customer, error: dbError } = await supabaseAdmin
      .from('customers')
      .select('email, contacto_nombre')
      .eq('id', id)
      .single()

    if (dbError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Usar 'invite' en vez de 'magiclink' — genera flujo PKCE compatible
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: customer.email,
      options: {
        redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
      },
    })

    if (linkError) throw linkError

    const setupLink = linkData.properties?.action_link
    if (!setupLink) {
      return NextResponse.json({ error: 'Could not generate link' }, { status: 500 })
    }

    await sendCustomerInviteEmail(customer.email, customer.contacto_nombre, setupLink, id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}