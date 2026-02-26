import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*, tarifa:tarifa_id(*, precios:tarifas_precios(sku, precio))')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, peso_total, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ customer, orders: orders ?? [] });
}

// PUT — actualizar tarifa, descuento y otros campos editables
export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ['contacto_nombre', 'company_name', 'telefono', 'nif_cif',
                   'direccion_envio', 'estado', 'tarifa_id', 'descuento_pct'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[customers PUT]', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error al actualizar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
