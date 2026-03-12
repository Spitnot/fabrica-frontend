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
  console.log('[profile GET] userId:', userId)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('customers')
    .select(`
      contacto_nombre, company_name, email, telefono, nif_cif, tipo_fiscal,
      nombre_comercial, tipo_empresa, numero_eori, fecha_constitucion,
      tipo_cliente, zona_distribucion, marcas_comercializadas,
      volumen_estimado, num_puntos_venta,
      direccion_envio, direccion_fiscal,
      onboarding_completed
    `)
    .eq('auth_user_id', userId)
    .single()
  console.log('[profile GET] onboarding_completed:', data?.onboarding_completed, 'error:', error?.message)
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const { supabase, userId } = await getAuthenticatedCustomerId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const allowed = [
    'contacto_nombre', 'telefono',
    'company_name', 'nombre_comercial', 'tipo_empresa',
    'nif_cif', 'tipo_fiscal', 'numero_eori', 'fecha_constitucion',
    'direccion_envio', 'direccion_fiscal',
    'tipo_cliente', 'zona_distribucion', 'marcas_comercializadas',
    'volumen_estimado', 'num_puntos_venta',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
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