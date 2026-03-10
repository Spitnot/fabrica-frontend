import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('order_items')
      .select(`
        sku,
        nombre_producto,
        cantidad,
        order:orders!inner(id, status, created_at, customer:customers(contacto_nombre, company_name))
      `)
      .in('orders.status', ['confirmado', 'produccion', 'listo_envio']);

    if (error) throw error;

    const { data: skuFungibles } = await supabaseAdmin
      .from('sku_fungibles')
      .select('sku, cantidad, fungible:fungibles(id, nombre, unidad)');

    const skuFungibleMap: Record<string, { id: string; nombre: string; unidad: string; cantidad_por_unidad: number }[]> = {};
    (skuFungibles ?? []).forEach((sf: any) => {
      const f = Array.isArray(sf.fungible) ? sf.fungible[0] : sf.fungible;
      if (!f) return;
      if (!skuFungibleMap[sf.sku]) skuFungibleMap[sf.sku] = [];
      skuFungibleMap[sf.sku].push({ id: f.id, nombre: f.nombre, unidad: f.unidad, cantidad_por_unidad: sf.cantidad });
    });

    const skuMap: Record<string, {
      sku: string;
      nombre_producto: string;
      unidades: number;
      pedidos: { id: string; status: string; cantidad: number; created_at: string; cliente: string }[];
    }> = {};

    (items ?? []).forEach((item: any) => {
      const order = Array.isArray(item.order) ? item.order[0] : item.order;
      if (!order) return;
      if (!skuMap[item.sku]) {
        skuMap[item.sku] = { sku: item.sku, nombre_producto: item.nombre_producto, unidades: 0, pedidos: [] };
      }
      skuMap[item.sku].unidades += item.cantidad;
      skuMap[item.sku].pedidos.push({
        id: order.id, status: order.status, cantidad: item.cantidad,
        created_at: order.created_at,
        cliente: order.customer?.company_name || order.customer?.contacto_nombre || '—',
      });
    });

    const fungibleTotals: Record<string, { id: string; nombre: string; unidad: string; total: number }> = {};

    Object.values(skuMap).forEach(s => {
      (skuFungibleMap[s.sku] ?? []).forEach(f => {
        if (!fungibleTotals[f.id]) fungibleTotals[f.id] = { id: f.id, nombre: f.nombre, unidad: f.unidad, total: 0 };
        fungibleTotals[f.id].total = parseFloat((fungibleTotals[f.id].total + s.unidades * f.cantidad_por_unidad).toFixed(3));
      });
    });

    const stock = Object.values(skuMap)
      .map(s => ({
        ...s,
        fungibles: (skuFungibleMap[s.sku] ?? []).map(f => ({
          id: f.id, nombre: f.nombre, unidad: f.unidad,
          total: parseFloat((s.unidades * f.cantidad_por_unidad).toFixed(3)),
        })),
      }))
      .sort((a, b) => b.unidades - a.unidades);

    return NextResponse.json({
      data: stock,
      fungible_totals: Object.values(fungibleTotals).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
