import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { StatusChip } from '@/components/fr/StatusChip';

export const dynamic = 'force-dynamic';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [
    { count: activos },
    { count: listos },
    { count: enviados },
    { data: facturacion },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).in('status', ['confirmado', 'produccion']),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'listo_envio'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'enviado').gte('created_at', startOfMonth),
    supabaseAdmin.from('orders').select('total_productos').in('status', ['confirmado', 'produccion', 'listo_envio', 'enviado']).gte('created_at', startOfMonth),
  ]);
  const facturacionMes = (facturacion ?? []).reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  return { activos: activos ?? 0, listos: listos ?? 0, enviados: enviados ?? 0, facturacionMes };
}

async function getRecentOrders() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, created_at, customer:customers(contacto_nombre, first_name, last_name, company_name)')
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getStockWidget() {
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('sku, nombre_producto, cantidad, order:orders!inner(status)')
    .in('orders.status', ['confirmado', 'produccion', 'listo_envio']);
  const { data: metas } = await supabaseAdmin
    .from('product_meta')
    .select('sku, volume_ml, alert_threshold_liters');
  const metaMap: Record<string, { volume_ml: number; alert_threshold_liters: number }> = {};
  (metas ?? []).forEach((m: any) => { metaMap[m.sku] = m; });
  const skuMap: Record<string, { sku: string; nombre: string; unidades: number; litros: number; alerta: boolean }> = {};
  (items ?? []).forEach((item: any) => {
    if (!skuMap[item.sku]) skuMap[item.sku] = { sku: item.sku, nombre: item.nombre_producto, unidades: 0, litros: 0, alerta: false };
    skuMap[item.sku].unidades += item.cantidad;
  });
  Object.values(skuMap).forEach(s => {
    const meta = metaMap[s.sku];
    if (meta?.volume_ml) {
      s.litros = parseFloat(((s.unidades * meta.volume_ml) / 1000).toFixed(2));
      s.alerta = s.litros >= meta.alert_threshold_liters;
    }
  });
  const all = Object.values(skuMap).sort((a, b) => b.unidades - a.unidades);
  return { top: all.slice(0, 5), alertas: all.filter(s => s.alerta).length, totalLitros: parseFloat(all.reduce((s, i) => s + i.litros, 0).toFixed(1)), totalSkus: all.length };
}

export default async function DashboardPage() {
  const [stats, orders, stock] = await Promise.all([getStats(), getRecentOrders(), getStockWidget()]);
  const mes = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="fr-label">{mes}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Dashboard</h1>
        </div>
        <Link href="/pedidos/nuevo"><button className="btn-primary">+ New Order</button></Link>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, border: '1px solid #111', background: '#111' }}>
        {[
          { label: 'Active orders',   value: stats.activos,                   accent: '#111' },
          { label: 'Ready to ship',   value: stats.listos,                    accent: '#0DA265' },
          { label: `Shipped ${mes}`,  value: stats.enviados,                  accent: '#111' },
          { label: `Revenue ${mes}`,  value: fmt(stats.facturacionMes),       accent: '#D93A35' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div className="fr-label">{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 36, lineHeight: 1, marginTop: 8, color: kpi.accent, fontVariantNumeric: 'tabular-nums' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>

        {/* Recent orders */}
        <div className="fr-card">
          <div className="fr-section-head">
            <span>Recent orders</span>
            <Link href="/pedidos" className="fr-label" style={{ color: '#D93A35' }}>View all →</Link>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>No orders yet</div>
          ) : orders.map((o: any, i: number) => {
            const first = o.customer?.first_name ?? o.customer?.contacto_nombre ?? '—';
            const last = o.customer?.last_name ?? '';
            return (
              <Link key={o.id} href={`/pedidos/${o.id}`} className="fr-row" style={{ gridTemplateColumns: '1fr 130px 110px 70px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{`${first} ${last}`.trim()}</div>
                  <div className="fr-label" style={{ color: '#111' }}>{o.customer?.company_name}</div>
                </div>
                <StatusChip status={o.status} size="sm" />
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(o.total_productos)}
                </div>
                <div className="fr-label" style={{ color: '#111', textAlign: 'right' }}>
                  {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Production */}
        <div className="fr-card">
          <div className="fr-section-head">
            <span>Production floor</span>
            <Link href="/produccion" className="fr-label" style={{ color: '#D93A35' }}>View →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #111' }}>
            {[
              { label: 'SKUs',   value: stock.totalSkus },
              { label: 'Liters', value: `${stock.totalLitros}` },
              { label: 'Alerts', value: stock.alertas, accent: stock.alertas > 0 ? '#D93A35' : '#111' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '16px', borderRight: i < 2 ? '1px solid #111' : 'none' }}>
                <div className="fr-label">{s.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 28, lineHeight: 1, marginTop: 6, color: (s as any).accent ?? '#111', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {stock.top.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>No pending stock</div>
          ) : stock.top.map((s, i) => (
            <div key={s.sku} className="fr-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.nombre}</div>
                <div className="fr-label" style={{ color: '#111' }}>{s.sku}{s.alerta && ' · LOW'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, color: s.alerta ? '#D93A35' : '#111', fontVariantNumeric: 'tabular-nums' }}>
                {s.unidades.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
