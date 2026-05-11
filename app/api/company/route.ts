import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin, requireStaff } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { response } = await requireStaff()
  if (response) return response

  const { data, error } = await supabaseAdmin
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('[company GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  // Company settings include API keys and IBAN — restrict to admin only
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json()

  const allowed = [
    'razon_social', 'nombre_comercial', 'nif', 'eori',
    'direccion', 'ciudad', 'cp', 'provincia', 'pais',
    'telefono', 'email_fiscal', 'web',
    'serie_default', 'siguiente_numero', 'iva_default',
    'pie_factura', 'payment_terms',
    'iban', 'bic', 'titular_cuenta', 'banco',
    'logo_url', 'color_primario',
    'incoterm_default', 'packlink_api_key',
    'dhl_account_number', 'dhl_api_key', 'dhl_api_secret',
    'adr_contact_name', 'adr_contact_phone', 'adr_contact_email',
    'gdrive_folder_id',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] === '' ? null : body[key]
  }

  const { data: existing } = await supabaseAdmin
    .from('company_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    const { error } = await supabaseAdmin.from('company_settings').insert(updates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .update(updates)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
