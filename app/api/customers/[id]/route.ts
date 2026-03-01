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

// DELETE — eliminar cliente (auth + registro en customers)
export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  // Get auth_user_id before deleting the customer record
  const { data: customer, error: fetchError } = await supabaseAdmin
    .from('customers')
    .select('auth_user_id')
    .eq('id', id)
    .single();

  if (fetchError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Delete from customers table first (cascade will handle related rows if FK set)
  const { error: deleteError } = await supabaseAdmin
    .from('customers')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[customers DELETE] db:', deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Delete auth user
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(customer.auth_user_id);
  if (authError) {
    console.error('[customers DELETE] auth:', authError.message);
    // Non-fatal — customer row is already gone
  }

  return NextResponse.json({ ok: true });
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
