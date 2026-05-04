// app/(dashboard)/dashboard/page.tsx
// Server component — original data layer preserved 1:1.
// Body restructured to match Foundry/Marker mockup: dark hero, KPI strip with
// Alexandria 56 numerals, full-bleed orders table, dark production aside.

import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { KPI, PageHeader, FR } from '@/components/fr/Atoms';
import { StatusChip } from '@/components/fr/StatusChip';

export const dynamic = 'force-dynamic';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── data (unchanged) ───────────────────────────────────────────────────────

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
  const mes = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        eyebrow={`OVERVIEW · ${mes}`}
        title="GOOD MORNING"
        actions={<Link href="/pedidos/nuevo"><button className="btn-primary">+ NEW ORDER</button></Link>}
      />

      {/* KPI strip — Alexandria 56, accent only on the values that earn it */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KPI label="ACTIVE ORDERS" value={stats.activos} />
        <KPI label="READY TO SHIP" value={stats.listos} accent={FR.green} />
        <KPI label={`SHIPPED ${mes}`} value={stats.enviados} />
        <KPI label={`REVENUE ${mes}`} value={fmt(stats.facturacionMes)} accent={FR.red} />
      </div>

      {/* Two-col: orders + production */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>

        {/* Recent orders */}
        <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
          <div style={{ padding: '12px 16px', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>● RECENT ORDERS / LIVE</span>
            <Link href="/pedidos" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: FR.yellow, textTransform: 'uppercase' }}>VIEW ALL ↗</Link>
          </div>
          <div>
            {orders.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>No orders yet</div>
            ) : orders.map((o: any, i: number) => {
              const first = (o.customer as any)?.first_name ?? o.customer?.contacto_nombre ?? '—';
              const last = (o.customer as any)?.last_name ?? '';
              return (
                <Link
                  key={o.id}
                  href={`/pedidos/${o.id}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 130px 110px 70px',
                    padding: '12px 16px', gap: 12, alignItems: 'center',
                    borderBottom: i < orders.length - 1 ? 'var(--border-light)' : 'none',
                    color: '#111', textDecoration: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{`${first} ${last}`.trim()}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>{o.customer?.company_name}</div>
                  </div>
                  <StatusChip status={o.status} size="sm" />
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(o.total_productos)}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', textAlign: 'right' }}>
                    {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Production aside */}
        <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
          <div style={{ padding: '12px 16px', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>▲ PRODUCTION FLOOR</span>
            <Link href="/produccion" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: FR.yellow, textTransform: 'uppercase' }}>VIEW ↗</Link>
          </div>

          {/* 3-cell mini stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: 'var(--border-dash)' }}>
            {[
              { label: 'SKUS',    value: stock.totalSkus,                bg: '#fff',   fg: '#111' },
              { label: 'LITERS',  value: `${stock.totalLitros}`,         bg: '#fff',   fg: '#111' },
              { label: 'ALERTS',  value: stock.alertas,                  bg: '#111',   fg: stock.alertas > 0 ? FR.red : '#fff' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: 14, borderRight: i < 2 ? 'var(--border-light)' : 'none', background: s.bg, color: s.fg }}>
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: s.bg === '#111' ? '#aaa' : '#111' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 32, lineHeight: 1, marginTop: 8, letterSpacing: '-0.04em', color: s.fg, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {stock.top.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>No pending stock</div>
          ) : stock.top.map((s, i) => (
            <div key={s.sku} style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: i < stock.top.length - 1 ? 'var(--border-light)' : 'none',
              background: s.alerta ? 'rgba(217,58,53,0.06)' : 'transparent',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{s.nombre}</div>
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#888' }}>
                  {s.sku}{s.alerta && ' · LOW'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em', color: s.alerta ? FR.red : '#111', fontVariantNumeric: 'tabular-nums' }}>
                {s.unidades.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
