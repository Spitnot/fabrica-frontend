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

  if (!body.contacto_nombre?.trim())
    return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
  if (!body.company_name?.trim())
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  if (!body.nif_cif?.trim())
    return NextResponse.json({ error: 'Tax ID is required' }, { status: 400 })
  if (!body.fiscal_street?.trim() || !body.fiscal_city?.trim() || !body.fiscal_postal_code?.trim() || !body.fiscal_country?.trim())
    return NextResponse.json({ error: 'Fiscal address is required' }, { status: 400 })

  const updates: Record<string, unknown> = {
    contacto_nombre:    body.contacto_nombre.trim(),
    telefono:           body.telefono?.trim() ?? null,
    company_name:       body.company_name.trim(),
    nombre_comercial:   body.nombre_comercial?.trim()  ?? null,
    tipo_empresa:       body.tipo_empresa?.trim()       ?? null,
    nif_cif:            body.nif_cif.trim(),
    tipo_fiscal:        body.tipo_fiscal?.trim()        ?? 'NIF/CIF',
    numero_eori:        body.numero_eori?.trim()        ?? null,
    fecha_constitucion: body.fecha_constitucion         ?? null,
    direccion_fiscal: {
      street:      body.fiscal_street.trim(),
      city:        body.fiscal_city.trim(),
      state:       body.fiscal_state?.trim()      ?? '',
      postal_code: body.fiscal_postal_code.trim(),
      country:     body.fiscal_country.trim(),
    },
    direccion_envio: {
      street:      (body.same_address ? body.fiscal_street      : body.street)?.trim()      ?? '',
      city:        (body.same_address ? body.fiscal_city        : body.city)?.trim()        ?? '',
      postal_code: (body.same_address ? body.fiscal_postal_code : body.postal_code)?.trim() ?? '',
      country:     (body.same_address ? body.fiscal_country     : body.country)?.trim()     ?? '',
    },
    tipo_cliente:           body.tipo_cliente           ?? null,
    zona_distribucion:      body.zona_distribucion      ?? null,
    marcas_comercializadas: body.marcas_comercializadas ?? null,
    volumen_estimado:       body.volumen_estimado       ?? null,
    num_puntos_venta:       body.num_puntos_venta ? parseInt(body.num_puntos_venta) : null,
    onboarding_completed:   true,
  }

const { error, count } = await supabase
    .from('customers')
    .update(updates, { count: 'exact' })
    .eq('auth_user_id', userId)


  if (error) {
    console.error('[portal/onboarding POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Sync to auth metadata so middleware can read it without a DB query
  await supabase.auth.updateUser({ data: { onboarding_completed: true } })

  return NextResponse.json({ ok: true })
}