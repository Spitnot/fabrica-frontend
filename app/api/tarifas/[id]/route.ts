import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('*, precios:tarifas_precios(sku, precio, pack_size)')
    .eq('id', id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Pricing tier not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { count } = await supabaseAdmin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('tarifa_id', id)
    .eq('estado', 'active');
  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} active client${count !== 1 ? 's' : ''} assigned to this tier` },
      { status: 409 }
    );
  }
  await supabaseAdmin.from('tarifas_precios').delete().eq('tarifa_id', id);
  const { error } = await supabaseAdmin.from('tarifas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { nombre, descripcion, multiplicador, activo, hidden_products, minimum_order_value, pack_size } = await req.json();
  const updates: Record<string, unknown> = {};
  if (nombre              != null) updates.nombre              = nombre;
  if (descripcion         != null) updates.descripcion         = descripcion;
  if (multiplicador       != null) updates.multiplicador       = multiplicador;
  if (activo              != null) updates.activo              = activo;
  if (hidden_products     != null) updates.hidden_products     = hidden_products;
  if (minimum_order_value != null) updates.minimum_order_value = minimum_order_value;
  if (pack_size           != null) updates.pack_size           = pack_size;
  const { data, error } = await supabaseAdmin.from('tarifas').update(updates).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Failed to update' }, { status: 500 });
  return NextResponse.json(data);
}
