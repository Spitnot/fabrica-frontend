import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getAuthenticatedCustomerId() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, userId: null }
  return { supabase, userId: user.id }
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedCustomerId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('customers')
    .select(`
      first_name, last_name, contacto_nombre,
      company_name, email, telefono, telefono_e164, nif_cif, tipo_fiscal,
      nombre_comercial, tipo_empresa, numero_eori, fecha_constitucion,
      tipo_cliente, zona_distribucion, marcas_comercializadas,
      volumen_estimado, num_puntos_venta,
      ship_street1, ship_street2, ship_city, ship_state, ship_postal_code, ship_country,
      fiscal_street1, fiscal_street2, fiscal_city, fiscal_state, fiscal_postal_code, fiscal_country,
      onboarding_completed
    `)
    .eq('auth_user_id', userId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Normalize for frontend — expose as flat + legacy shape for compatibility
  const normalized = {
    ...data,
    // Legacy shape so existing UI doesn't break during migration
    contacto_nombre: (data.contacto_nombre ?? `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim()) || null,
    direccion_envio: {
      street:      data.ship_street1 ?? '',
      street2:     data.ship_street2 ?? '',
      city:        data.ship_city    ?? '',
      state:       data.ship_state   ?? '',
      postal_code: data.ship_postal_code ?? '',
      country:     data.ship_country ?? '',
    },
    direccion_fiscal: {
      street:      data.fiscal_street1 ?? '',
      street2:     data.fiscal_street2 ?? '',
      city:        data.fiscal_city    ?? '',
      state:       data.fiscal_state   ?? '',
      postal_code: data.fiscal_postal_code ?? '',
      country:     data.fiscal_country ?? '',
    },
  }

  return NextResponse.json({ data: normalized })
}

export async function PUT(req: NextRequest) {
  const { supabase, userId } = await getAuthenticatedCustomerId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  // New flat fields
  if ('first_name'  in body) updates.first_name  = body.first_name
  if ('last_name'   in body) updates.last_name    = body.last_name
  if ('telefono_e164' in body) updates.telefono_e164 = body.telefono_e164

  // Keep legacy contacto_nombre in sync
  if ('contacto_nombre' in body) {
    updates.contacto_nombre = body.contacto_nombre
    // Auto-split if first/last not provided
    if (!('first_name' in body)) {
      const parts = (body.contacto_nombre ?? '').trim().split(' ')
      updates.first_name = parts[0] ?? null
      updates.last_name  = parts.slice(1).join(' ') || null
    }
  }

  // Shipping address — accept both new flat and legacy JSON
  if (body.ship_street1 !== undefined) {
    updates.ship_street1     = body.ship_street1
    updates.ship_street2     = body.ship_street2     ?? null
    updates.ship_city        = body.ship_city        ?? null
    updates.ship_state       = body.ship_state       ?? null
    updates.ship_postal_code = body.ship_postal_code ?? null
    updates.ship_country     = body.ship_country     ?? null
  } else if (body.direccion_envio) {
    // Legacy JSON shape — map to flat columns
    updates.ship_street1     = body.direccion_envio.street      ?? null
    updates.ship_city        = body.direccion_envio.city        ?? null
    updates.ship_postal_code = body.direccion_envio.postal_code ?? null
    updates.ship_country     = body.direccion_envio.country     ?? null
  }

  // Other allowed fields
  const passthrough = [
    'company_name', 'nombre_comercial', 'tipo_empresa',
    'nif_cif', 'tipo_fiscal', 'numero_eori', 'fecha_constitucion',
    'tipo_cliente', 'zona_distribucion', 'marcas_comercializadas',
    'volumen_estimado', 'num_puntos_venta',
  ]
  for (const key of passthrough) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('auth_user_id', userId)

  if (error) {
    console.error('[portal/profile PUT]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
