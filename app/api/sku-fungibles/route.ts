import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get('sku');
  if (!sku) return NextResponse.json({ error: 'sku required' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('sku_fungibles')
    .select('id, cantidad, fungible:fungibles(id, nombre, unidad)')
    .eq('sku', sku);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const { sku, items } = await req.json();
  if (!sku) return NextResponse.json({ error: 'sku required' }, { status: 400 });
  await supabaseAdmin.from('sku_fungibles').delete().eq('sku', sku);
  if (items?.length > 0) {
    const rows = items
      .filter((i: any) => i.fungible_id && i.cantidad > 0)
      .map((i: any) => ({ sku, fungible_id: i.fungible_id, cantidad: i.cantidad }));
    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from('sku_fungibles').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
