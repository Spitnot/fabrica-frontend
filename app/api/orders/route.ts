import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendOrderConfirmationToCustomer, sendNewOrderToAdmin } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { customer_id, items, coste_envio_estimado } = await req.json();

  if (!customer_id || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
  }

  // Calcular totales
  const total_productos = items.reduce(
    (s: number, i: any) => s + i.cantidad * i.precio_unitario, 0
  );
  const peso_total = items.reduce(
    (s: number, i: any) => s + i.cantidad * i.peso_unitario, 0
  );

  // 1. Crear el pedido
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id,
      status: 'confirmado',
      total_productos: parseFloat(total_productos.toFixed(2)),
      peso_total:      parseFloat(peso_total.toFixed(3)),
      coste_envio_estimado: coste_envio_estimado ?? null,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[orders POST]', orderError?.message);
    return NextResponse.json({ error: orderError?.message ?? 'Error al crear pedido' }, { status: 500 });
  }

  // 2. Insertar line items
  const lineItems = items.map((i: any) => ({
    order_id:        order.id,
    sku:             i.sku,
    nombre_producto: i.nombre_producto,
    cantidad:        i.cantidad,
    precio_unitario: i.precio_unitario,
    peso_unitario:   i.peso_unitario,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(lineItems);

  if (itemsError) {
    console.error('[orders POST items]', itemsError.message);
    // Borrar el pedido si fallan los items
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // 3. Enviar emails (best-effort, no bloquea la respuesta)
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, email, contacto_nombre, company_name')
    .eq('id', customer_id)
    .single();

  if (customer) {
    void Promise.allSettled([
      sendOrderConfirmationToCustomer({
        to: customer.email, nombre: customer.contacto_nombre,
        orderId: order.id, total: total_productos, itemCount: items.length,
        customerId: customer.id,
      }),
      sendNewOrderToAdmin({
        orderId: order.id, customerName: customer.contacto_nombre,
        company: customer.company_name, total: total_productos,
        itemCount: items.length, customerId: customer.id,
      }),
    ]).then((results) =>
      results.forEach((r, i) => {
        if (r.status === 'rejected')
          console.error(`[orders POST] email[${i}]:`, r.reason);
      }),
    );
  }

  return NextResponse.json({ id: order.id }, { status: 201 });
}
