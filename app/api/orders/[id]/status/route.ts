import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendShippingEmail } from '@/lib/emailService'
import type { OrderStatus } from '@/types'

const VALID_STATUSES: OrderStatus[] = [
  'draft', 'confirmado', 'produccion', 'listo_envio', 'enviado', 'cancelado'
]

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft:       ['confirmado', 'cancelado'],
  confirmado:  ['produccion', 'cancelado'],
  produccion:  ['listo_envio', 'cancelado'],
  listo_envio: ['enviado', 'cancelado'],
  enviado:     [],
  cancelado:   [],
}

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params
  const formData = await req.formData()
  const newStatus = formData.get('status') as OrderStatus

  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Leer estado actual del pedido (solo columnas que existen)
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('status, customer_id, tracking_url')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found', debug: { id, fetchError } }, { status: 404 })
  }

  const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${newStatus}` },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Enviar email de shipping cuando el pedido pasa a enviado
  if (newStatus === 'enviado' && order.customer_id) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('email, contacto_nombre')
      .eq('id', order.customer_id)
      .single()
    if (customer?.email) {
      await sendShippingEmail(
        customer.email,
        customer.contacto_nombre,
        id,
        order.tracking_url ?? undefined,
        undefined,
        order.customer_id,
        id,
      )
    }
  }

  return NextResponse.redirect(new URL(`/pedidos/${id}`, req.url), { status: 303 })
}