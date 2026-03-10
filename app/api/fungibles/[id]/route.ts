import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from('fungibles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { nombre, unidad } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('fungibles')
    .update({ nombre, unidad })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
