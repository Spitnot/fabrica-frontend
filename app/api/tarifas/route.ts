import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET — lista todas las tarifas activas
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('id, nombre, descripcion, multiplicador, activo, created_at')
    .order('nombre');

  if (error) {
    console.error('[tarifas GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST — crear nueva tarifa
export async function POST(req: NextRequest) {
  const { nombre, descripcion, multiplicador } = await req.json();

  if (!nombre || multiplicador == null) {
    return NextResponse.json({ error: 'nombre y multiplicador son obligatorios' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .insert({ nombre, descripcion: descripcion || null, multiplicador })
    .select('*')
    .single();

  if (error) {
    console.error('[tarifas POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
