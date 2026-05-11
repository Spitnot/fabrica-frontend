import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdminManager } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Props) {
  const { response } = await requireAdminManager()
  if (response) return response

  const { id: tarifa_id } = await params
  const { precios } = await req.json() as { precios: { sku: string; precio: number; pack_size?: number | null }[] }

  if (!Array.isArray(precios)) {
    return NextResponse.json({ error: 'prices must be an array' }, { status: 400 })
  }

  const { data: tarifa } = await supabaseAdmin
    .from('tarifas')
    .select('id')
    .eq('id', tarifa_id)
    .single()

  if (!tarifa) {
    return NextResponse.json({ error: 'Pricing tier not found' }, { status: 404 })
  }

  await supabaseAdmin.from('tarifas_precios').delete().eq('tarifa_id', tarifa_id)

  if (precios.length > 0) {
    const rows = precios
      .filter(p => p.sku && (p.precio > 0 || p.pack_size != null))
      .map(p => ({
        tarifa_id,
        sku:       p.sku,
        precio:    p.precio,
        pack_size: p.pack_size ?? null,
      }))

    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from('tarifas_precios').insert(rows)
      if (error) {
        console.error('[tarifas precios PUT]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
