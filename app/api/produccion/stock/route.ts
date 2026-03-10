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

    const { data: metas } = await supabaseAdmin
      .from('product_meta')
      .select('sku, volume_ml, alert_threshold_liters');

    const metaMap: Record<string, { volume_ml: number; alert_threshold_liters: number }> = {};
    (metas ?? []).forEach((m: any) => { metaMap[m.sku] = m; });

    const skuMap: Record<string, {
      sku: string;
      nombre_producto: string;
      unidades: number;
      volume_ml: number;
      alert_threshold_liters: number;
      litros_totales: number;
      alerta: boolean;
      pedidos: { id: string; status: string; cantidad: number; created_at: string; cliente: string }[];
    }> = {};

    (items ?? []).forEach((item: any) => {
      const order = Array.isArray(item.order) ? item.order[0] : item.order;
      if (!order) return;

      if (!skuMap[item.sku]) {
        skuMap[item.sku] = {
          sku:                    item.sku,
          nombre_producto:        item.nombre_producto,
          unidades:               0,
          volume_ml:              metaMap[item.sku]?.volume_ml ?? 0,
          alert_threshold_liters: metaMap[item.sku]?.alert_threshold_liters ?? 10,
          litros_totales:         0,
          alerta:                 false,
          pedidos:                [],
        };
      }

      skuMap[item.sku].unidades += item.cantidad;
      skuMap[item.sku].pedidos.push({
        id:         order.id,
        status:     order.status,
        cantidad:   item.cantidad,
        created_at: order.created_at,
        cliente:    order.customer?.company_name || order.customer?.contacto_nombre || '—',
      });
    });

    const stock = Object.values(skuMap)
      .map(s => ({
        ...s,
        litros_totales: parseFloat(((s.unidades * s.volume_ml) / 1000).toFixed(2)),
        alerta:         s.volume_ml > 0 && (s.unidades * s.volume_ml) / 1000 >= s.alert_threshold_liters,
      }))
      .sort((a, b) => b.unidades - a.unidades);

    return NextResponse.json({ data: stock });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
