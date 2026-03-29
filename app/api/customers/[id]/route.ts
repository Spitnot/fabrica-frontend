import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*, tarifa:tarifa_id(*, precios:tarifas_precios(sku, precio))')
    .eq('id', id)
    .single()

  if (error || !customer)
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Normalize legacy fields for frontend compatibility
  const normalized = {
    ...customer,
    contacto_nombre: (customer.contacto_nombre ?? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()) || null,

    direccion_envio: {
      street:      customer.ship_street1     ?? '',
      street2:     customer.ship_street2     ?? '',
      city:        customer.ship_city        ?? '',
      state:       customer.ship_state       ?? '',
      postal_code: customer.ship_postal_code ?? '',
      country:     customer.ship_country     ?? '',
    },
    direccion_fiscal: {
      street:      customer.fiscal_street1     ?? '',
      street2:     customer.fiscal_street2     ?? '',
      city:        customer.fiscal_city        ?? '',
      state:       customer.fiscal_state       ?? '',
      postal_code: customer.fiscal_postal_code ?? '',
      country:     customer.fiscal_country     ?? '',
    },
  }

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, peso_total, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ customer: normalized, orders: orders ?? [] })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params

  const { error: deleteError } = await supabaseAdmin
    .from('customers')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[customers DELETE] db:', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authError) console.error('[customers DELETE] auth:', authError.message)

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}

  // New flat fields
  if ('first_name'      in body) updates.first_name      = body.first_name
  if ('last_name'       in body) updates.last_name        = body.last_name
  if ('telefono_e164'   in body) updates.telefono_e164    = body.telefono_e164
  if ('ship_street1'    in body) updates.ship_street1     = body.ship_street1
  if ('ship_street2'    in body) updates.ship_street2     = body.ship_street2
  if ('ship_city'       in body) updates.ship_city        = body.ship_city
  if ('ship_state'      in body) updates.ship_state       = body.ship_state
  if ('ship_postal_code' in body) updates.ship_postal_code = body.ship_postal_code
  if ('ship_country'    in body) updates.ship_country     = body.ship_country

  // Legacy fields still allowed during migration
  const allowed = ['contacto_nombre', 'company_name', 'telefono', 'nif_cif', 'estado', 'tarifa_id', 'descuento_pct']
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Keep first/last in sync with contacto_nombre
  if ('contacto_nombre' in body && !('first_name' in body)) {
    const parts = (body.contacto_nombre ?? '').trim().split(' ')
    updates.first_name = parts[0] ?? null
    updates.last_name  = parts.slice(1).join(' ') || null
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[customers PUT]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
