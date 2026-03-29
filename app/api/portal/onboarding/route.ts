import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getAuthenticatedCustomerId() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, userId: null }
  return { supabase, userId: user.id }
}

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getAuthenticatedCustomerId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validation
  if (!body.contacto_nombre?.trim())
    return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
  if (!body.company_name?.trim())
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  if (!body.nif_cif?.trim())
    return NextResponse.json({ error: 'Tax ID is required' }, { status: 400 })
  if (!body.fiscal_street?.trim() || !body.fiscal_city?.trim() || !body.fiscal_postal_code?.trim() || !body.fiscal_country?.trim())
    return NextResponse.json({ error: 'Fiscal address is required' }, { status: 400 })

  // Split contacto_nombre into first/last
  const nameParts  = body.contacto_nombre.trim().split(' ')
  const first_name = nameParts[0] ?? null
  const last_name  = nameParts.slice(1).join(' ') || null

  // Normalize phone to E.164
  const rawPhone = body.telefono?.trim() ?? null
  const telefono_e164 = rawPhone?.replace(/\s+/g, '') ?? null

  // Shipping address — same as fiscal or separate
  const shipStreet  = (body.same_address ? body.fiscal_street      : body.street)?.trim()      ?? ''
  const shipCity    = (body.same_address ? body.fiscal_city        : body.city)?.trim()        ?? ''
  const shipState   = (body.same_address ? body.fiscal_state       : body.state)?.trim()       ?? ''
  const shipPostal  = (body.same_address ? body.fiscal_postal_code : body.postal_code)?.trim() ?? ''
  const shipCountry = (body.same_address ? body.fiscal_country     : body.country)?.trim()     ?? ''

  const updates: Record<string, unknown> = {
    // Contact
    contacto_nombre: body.contacto_nombre.trim(),
    first_name,
    last_name,
    telefono:        rawPhone,
    telefono_e164,

    // Company
    company_name:       body.company_name.trim(),
    nombre_comercial:   body.nombre_comercial?.trim()  ?? null,
    tipo_empresa:       body.tipo_empresa?.trim()       ?? null,
    nif_cif:            body.nif_cif.trim(),
    tipo_fiscal:        body.tipo_fiscal?.trim()        ?? 'NIF/CIF',
    numero_eori:        body.numero_eori?.trim()        ?? null,
    fecha_constitucion: body.fecha_constitucion         ?? null,

    // Fiscal address — flat columns
    fiscal_street1:     body.fiscal_street.trim(),
    fiscal_city:        body.fiscal_city.trim(),
    fiscal_state:       body.fiscal_state?.trim()       ?? null,
    fiscal_postal_code: body.fiscal_postal_code.trim(),
    fiscal_country:     body.fiscal_country.trim().toUpperCase(),

    // Shipping address — flat columns
    ship_street1:     shipStreet,
    ship_city:        shipCity,
    ship_state:       shipState  || null,
    ship_postal_code: shipPostal,
    ship_country:     shipCountry.toUpperCase(),

    // Commercial
    tipo_cliente:           body.tipo_cliente           ?? null,
    zona_distribucion:      body.zona_distribucion      ?? null,
    marcas_comercializadas: body.marcas_comercializadas ?? null,
    volumen_estimado:       body.volumen_estimado        ?? null,
    num_puntos_venta:       body.num_puntos_venta ? parseInt(body.num_puntos_venta) : null,

    onboarding_completed: true,
  }

  const { error, count } = await supabase
    .from('customers')
    .update(updates, { count: 'exact' })
    .eq('auth_user_id', userId)

  if (error) {
    console.error('[portal/onboarding POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (count === 0)
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  await supabase.auth.updateUser({ data: { onboarding_completed: true } })

  return NextResponse.json({ ok: true })
}
