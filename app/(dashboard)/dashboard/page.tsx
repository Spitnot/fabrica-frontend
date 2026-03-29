import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const STATUS_COLORS: Record<string, string> = {
  draft:       '#876693',
  confirmado:  '#0087B8',
  produccion:  '#E6883E',
  listo_envio: '#0DA265',
  enviado:     '#111111',
  cancelado:   '#999999',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};

// ─── data ───────────────────────────────────────────────────────────────────

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
    .limit(6);
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
  return {
    top: all.slice(0, 5),
    alertas: all.filter(s => s.alerta).length,
    totalLitros: parseFloat(all.reduce((s, i) => s + i.litros, 0).toFixed(1)),
    totalSkus: all.length,
  };
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, orders, stock] = await Promise.all([getStats(), getRecentOrders(), getStockWidget()]);

  const mes = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Active Orders',       value: stats.activos,              color: '#0087B8' },
    { label: 'Ready to Ship',       value: stats.listos,               color: '#876693' },
    { label: 'Shipped This Month',  value: stats.enviados,             color: '#0DA265', sub: mes },
    { label: 'Revenue MTD',         value: fmt(stats.facturacionMes),  color: '#D93A35', sub: mes },
  ];

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: 'var(--border)' }}>
        <div>
          <div className="page-title">Dashboard</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3, letterSpacing: '0.04em' }}>General overview</div>
        </div>
        <Link href="/pedidos/nuevo">
          <button className="btn-primary">+ New Order</button>
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {statCards.map((c) => (
          <div key={c.label} className="card" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: c.color, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {c.value}
            </div>
            {c.sub && (
              <div style={{ fontSize: 9, color: '#bbb', marginTop: 3 }}>{c.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Orders + Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12 }}>

        {/* Recent orders */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-label">Recent Orders</span>
            <Link href="/pedidos" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#D93A35', textTransform: 'uppercase' }}>
              View all →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Client', 'Status', 'Amount', 'Date'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>
                    No orders yet
                  </td>
                </tr>
              ) : orders.map((o: any, i: number) => (
                <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <td style={{ padding: '9px 14px' }}>
                    <Link href={`/pedidos/${o.id}`}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                        {`${(o.customer as any)?.first_name ?? o.customer?.contacto_nombre ?? "—"} ${(o.customer as any)?.last_name ?? ""}`.trim()}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>{o.customer?.company_name}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span className="badge" style={{ background: STATUS_COLORS[o.status] ?? '#999' }}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 900, color: '#111' }}>
                    {fmt(o.total_productos)}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock widget */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-label">Production</span>
            <Link href="/produccion" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#D93A35', textTransform: 'uppercase' }}>
              View →
            </Link>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: 'var(--border)' }}>
            {[
              { label: 'SKUs',    value: stock.totalSkus,    alert: false },
              { label: 'Liters',  value: `${stock.totalLitros}L`, alert: false },
              { label: 'Alerts',  value: stock.alertas,      alert: stock.alertas > 0 },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '10px', textAlign: 'center', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.alert ? '#D93A35' : '#111', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 8, color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Top SKUs */}
          <div>
            {stock.top.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>
                No pending stock
              </div>
            ) : stock.top.map((s, i) => (
              <div key={s.sku} style={{
                padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < stock.top.length - 1 ? '1px solid #f5f5f5' : 'none',
                background: s.alerta ? '#fff8f8' : 'transparent',
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{s.nombre}</div>
                  <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'monospace' }}>{s.sku}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>
                    {s.unidades.toLocaleString()}<span style={{ fontSize: 9, fontWeight: 400, color: '#aaa' }}>u</span>
                  </div>
                  {s.litros > 0 && (
                    <div style={{ fontSize: 9, color: s.alerta ? '#D93A35' : '#bbb', fontFamily: 'monospace' }}>
                      {s.alerta ? '⚠ ' : ''}{s.litros}L
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
