import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdminManager } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { response } = await requireAdminManager()
  if (response) return response

  const { id } = await params

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, packlink_shipment_id, status')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (!order.packlink_shipment_id) {
    return NextResponse.json({ error: 'No Packlink shipment ID' }, { status: 400 })
  }

  const res = await fetch(
    `${process.env.PACKLINK_API_URL}/shipments/${order.packlink_shipment_id}`,
    {
      headers: {
        'Authorization': process.env.PACKLINK_API_KEY!,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[tracking] Packlink error:', text)
    return NextResponse.json({ error: 'Error querying Packlink' }, { status: 500 })
  }

  const shipment = await res.json()
  const tracking_url = shipment.tracking_url ?? shipment.carrier_tracking_url ?? null

  if (tracking_url) {
    await supabaseAdmin
      .from('orders')
      .update({ tracking_url })
      .eq('id', id)
  }

  return NextResponse.redirect(new URL(`/pedidos/${id}`, _req.url), { status: 303 })
}
