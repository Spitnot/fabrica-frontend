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

    const total_productos = items.reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0)
    const peso_total      = items.reduce((s: number, i: any) => s + i.peso_unitario * i.cantidad, 0)

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
      .insert(items.map((i: any) => ({
        order_id:        order.id,
        sku:             i.sku,
        nombre_producto: i.nombre_producto,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
        peso_unitario:   i.peso_unitario,
      })))

    if (itemsError) throw itemsError

    return NextResponse.json({ id: order.id, data: order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
