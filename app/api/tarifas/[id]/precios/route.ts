import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

// PUT — reemplaza todos los precios de la tarifa (bulk upsert)
// body: { precios: { sku: string; precio: number }[] }
export async function PUT(req: NextRequest, { params }: Props) {
  const { id: tarifa_id } = await params;
  const { precios } = await req.json() as { precios: { sku: string; precio: number }[] };

  if (!Array.isArray(precios)) {
    return NextResponse.json({ error: 'precios debe ser un array' }, { status: 400 });
  }

  // Verificar que la tarifa existe
  const { data: tarifa } = await supabaseAdmin
    .from('tarifas')
    .select('id')
    .eq('id', tarifa_id)
    .single();

  if (!tarifa) {
    return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 });
  }

  // Borrar todos los precios existentes de esta tarifa
  await supabaseAdmin.from('tarifas_precios').delete().eq('tarifa_id', tarifa_id);

  // Insertar los nuevos (si hay)
  if (precios.length > 0) {
    const rows = precios
      .filter(p => p.sku && p.precio > 0)
      .map(p => ({ tarifa_id, sku: p.sku, precio: p.precio }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from('tarifas_precios').insert(rows);
      if (error) {
        console.error('[tarifas precios PUT]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
