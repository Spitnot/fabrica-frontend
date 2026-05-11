import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth'

// GET — all orders (admin dashboard only)
export async function GET() {
  const { response } = await requireStaff()
  if (response) return response

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customers(first_name, last_name, company_name, email)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — create new order (staff or authenticated customer for their own account)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { items, customer_id, coste_envio_estimado } = body

    if (!customer_id) throw new Error('customer_id is required')
    if (!items?.length) throw new Error('items is required')

    // Customers can only create orders for themselves
    const role: string = user.user_metadata?.role ?? ''
    const isStaff = ['admin', 'manager'].includes(role)
    if (!isStaff && user.id !== customer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate prices server-side against tarifas_precios
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('tarifa_id')
      .eq('id', customer_id)
      .single()

    const serverPrices: Record<string, number> = {}
    if (customer?.tarifa_id) {
      const skus = items.map((i: any) => i.sku)
      const { data: tarifaPrecios } = await supabaseAdmin
        .from('tarifas_precios')
        .select('sku, precio')
        .eq('tarifa_id', customer.tarifa_id)
        .in('sku', skus)
      if (tarifaPrecios) {
        for (const tp of tarifaPrecios) serverPrices[tp.sku] = tp.precio
      }
    }

    const validatedItems = items.map((item: any) => {
      const serverPrice = serverPrices[item.sku]
      if (serverPrice !== undefined) {
        if (Math.abs(serverPrice - item.precio_unitario) > 0.01) {
          console.warn(`[pedidos] Price mismatch SKU ${item.sku}: client=${item.precio_unitario}, server=${serverPrice}`)
        }
        return { ...item, precio_unitario: serverPrice }
      }
      console.warn(`[pedidos] No explicit price for SKU ${item.sku} tarifa ${customer?.tarifa_id} — using client value`)
      return item
    })

    const total_productos = validatedItems.reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0)
    const peso_total      = validatedItems.reduce((s: number, i: any) => s + i.peso_unitario * i.cantidad, 0)

    // Idempotency: reject if a confirmed order with same customer+total was created in the last 60s
    const cutoff = new Date(Date.now() - 60_000).toISOString()
    const { data: recentOrder } = await supabaseAdmin
      .from('orders')
      .select('id, total_productos')
      .eq('customer_id', customer_id)
      .eq('status', 'confirmado')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentOrder && Math.abs(recentOrder.total_productos - total_productos) < 0.01) {
      console.warn('[pedidos] Duplicate order detected within 60s, returning existing:', recentOrder.id)
      return NextResponse.json({ id: recentOrder.id, duplicate: true })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id,
        status: 'confirmado',
        total_productos,
        peso_total,
        coste_envio_estimado: coste_envio_estimado ?? null,
      })
      .select('*, customers(email, first_name, last_name)')
      .single()

    if (orderError) throw orderError

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(validatedItems.map((i: any) => ({
        order_id:        order.id,
        sku:             i.sku,
        nombre_producto: i.nombre_producto,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
        peso_unitario:   i.peso_unitario,
      })))

    if (itemsError) {
      // Best-effort rollback: remove orphaned order
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    return NextResponse.json({ id: order.id, data: order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
