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
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).in('status', ['listo_envio', 'esperando_pago']),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'enviado').gte('created_at', startOfMonth),
    supabaseAdmin.from('orders').select('total_productos').in('status', ['confirmado', 'produccion', 'listo_envio', 'esperando_pago', 'enviado']).gte('created_at', startOfMonth),
  ]);
  const facturacionMes = (facturacion ?? []).reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  return { activos: activos ?? 0, listos: listos ?? 0, enviados: enviados ?? 0, facturacionMes };
}

async function getRecentOrders() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, created_at, customer:customers(first_name, last_name, company_name)')
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getStockWidget() {
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('sku, nombre_producto, cantidad, order:orders!inner(status)')
    .in('orders.status', ['confirmado', 'produccion', 'listo_envio', 'esperando_pago']);
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
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-end', paddingBottom: 20, borderBottom: '2px solid #111' }}>
        <div>
          <div className="fr-label" style={{ marginBottom: 6 }}>{today}</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 38, fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
            Dashboard<span style={{ color: '#D93A35' }}>.</span>
          </h1>
        </div>
        <Link href="/pedidos/nuevo"><button className="btn-primary">+ New Order</button></Link>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, border: '1px solid #111', background: '#111' }}>
        {[
          { label: 'Active orders',  value: stats.activos,           accent: '#111',    note: 'In production or confirmed' },
          { label: 'Ready to ship',  value: stats.listos,            accent: '#0DA265', note: 'Awaiting dispatch' },
          { label: 'Shipped',        value: stats.enviados,          accent: '#111',    note: mes },
          { label: 'Revenue',        value: fmt(stats.facturacionMes), accent: '#D93A35', note: mes },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div className="fr-label">{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 36, lineHeight: 1.05, marginTop: 8, color: kpi.accent, fontVariantNumeric: 'tabular-nums' }}>
              {kpi.value}
            </div>
            <div className="fr-label" style={{ marginTop: 6, opacity: 0.5 }}>{kpi.note}</div>
          </div>
        ))}
      </div>

      {/* Two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>

        {/* Recent orders */}
        <div className="fr-card" style={{ overflow: 'hidden' }}>
          <div className="fr-section-head">
            <span>Recent Orders</span>
            <Link href="/pedidos" className="fr-label" style={{ color: '#D93A35' }}>View all →</Link>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#111' }}>No orders yet</div>
            </div>
          ) : orders.map((o: any) => {
            const name = o.customer?.first_name
              ? `${o.customer.first_name} ${o.customer.last_name ?? ''}`.trim()
              : '—';
            return (
              <Link key={o.id} href={`/pedidos/${o.id}`} className="fr-row" style={{ gridTemplateColumns: '1fr 120px 100px 64px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div className="fr-label" style={{ marginTop: 2 }}>{o.customer?.company_name}</div>
                </div>
                <StatusChip status={o.status} size="sm" />
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(o.total_productos)}
                </div>
                <div className="fr-label" style={{ textAlign: 'right' }}>
                  {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Production */}
        <div className="fr-card" style={{ overflow: 'hidden' }}>
          <div className="fr-section-head">
            <span>Production</span>
            <Link href="/produccion" className="fr-label" style={{ color: '#D93A35' }}>View →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#111', borderBottom: '1px solid #111' }}>
            {[
              { label: 'SKUs',   value: stock.totalSkus,   accent: '#111' },
              { label: 'Liters', value: stock.totalLitros, accent: '#111' },
              { label: 'Alerts', value: stock.alertas,     accent: stock.alertas > 0 ? '#D93A35' : '#0DA265' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', padding: '14px 16px' }}>
                <div className="fr-label">{s.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 26, lineHeight: 1, marginTop: 6, color: s.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {stock.top.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>No pending stock</div>
          ) : stock.top.map(s => (
            <div key={s.sku} className="fr-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.nombre}</div>
                <div className="fr-label" style={{ marginTop: 2 }}>
                  {s.sku}{s.alerta && <span style={{ color: '#D93A35', marginLeft: 6 }}>· LOW</span>}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 22, color: s.alerta ? '#D93A35' : '#111', fontVariantNumeric: 'tabular-nums' }}>
                {s.unidades.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
