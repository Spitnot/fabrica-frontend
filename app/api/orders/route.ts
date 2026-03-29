import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET — all orders with customer join (admin only)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customers(contacto_nombre, first_name, last_name, company_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create new order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, customer_id, coste_envio_estimado } = body;

    if (!customer_id) throw new Error('customer_id is required');
    if (!items?.length) throw new Error('items is required');

    const total_productos = items.reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0);
    const peso_total      = items.reduce((s: number, i: any) => s + i.peso_unitario * i.cantidad, 0);

    // 1. Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id,
        status: 'confirmado',
        total_productos,
        peso_total,
        coste_envio_estimado: coste_envio_estimado ?? null,
      })
      .select('*, customers(email, contacto_nombre, first_name, last_name)')
      .single();

    if (orderError) throw orderError;

    // 2. Insert order items
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(items.map((i: any) => ({
        order_id:        order.id,
        sku:             i.sku,
        nombre_producto: i.nombre_producto,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
        peso_unitario:   i.peso_unitario,
      })));

    if (itemsError) throw itemsError;

    return NextResponse.json({ id: order.id, data: order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}