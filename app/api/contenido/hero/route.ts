import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('portal_hero')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = user.user_metadata?.role
  if (!['admin', 'manager'].includes(role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const updates = {
    active:       body.active       ?? false,
    bg_image_url: body.bg_image_url ?? '',
    titulo:       body.titulo       ?? '',
    descripcion:  body.descripcion  ?? '',
    cta_label:    body.cta_label    ?? '',
    cta_href:     body.cta_href     ?? '/portal/pedidos/nuevo',
    updated_at:   new Date().toISOString(),
  }

  const { data: existing } = await supabaseAdmin
    .from('portal_hero').select('id').limit(1).maybeSingle()

  const { error } = existing
    ? await supabaseAdmin.from('portal_hero').update(updates).eq('id', existing.id)
    : await supabaseAdmin.from('portal_hero').insert(updates)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
