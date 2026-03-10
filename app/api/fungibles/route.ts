import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('fungibles')
    .select('*')
    .order('nombre');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { nombre, unidad } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre required' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('fungibles')
    .insert({ nombre: nombre.trim(), unidad: unidad ?? 'ml' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
