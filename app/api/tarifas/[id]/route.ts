import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

// GET — tarifa con sus precios por SKU
export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('*, precios:tarifas_precios(sku, precio)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT — actualizar nombre, descripcion, multiplicador
export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { nombre, descripcion, multiplicador, activo } = await req.json();

  const updates: Record<string, unknown> = {};
  if (nombre        != null) updates.nombre        = nombre;
  if (descripcion   != null) updates.descripcion   = descripcion;
  if (multiplicador != null) updates.multiplicador = multiplicador;
  if (activo        != null) updates.activo        = activo;

  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[tarifas PUT]', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error al actualizar' }, { status: 500 });
  }

  return NextResponse.json(data);
}
