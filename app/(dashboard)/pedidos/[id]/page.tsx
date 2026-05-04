// app/(dashboard)/pedidos/[id]/page.tsx
// Server component — original data fetching, ShipmentPanel/OrderActions usage,
// types, and routing preserved 1:1. JSX restructured to match Foundry mockup.

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';
import { ShipmentPanel } from './ShipmentPanel';
import { OrderActions } from './OrderActions';
import Link from 'next/link';
import { FR, BackLink } from '@/components/fr/Atoms';
import { StatusChip, FRStatus } from '@/components/fr/StatusChip';

export const dynamic = 'force-dynamic';

type OrderFull = Order & { customer: Customer; order_items: OrderItem[] };

async function getOrder(id: string): Promise<OrderFull | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, customer:customers(*), order_items(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};
const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'enviado'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const monoLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#888',
};

const sectionHeader: React.CSSProperties = {
  padding: '12px 16px', background: '#111', color: '#fff',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase',
};

interface Props { params: Promise<{ id: string }> }

export default async function PedidoDetallePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const customer = order.customer as any;
  const address = customer?.ship_street1
    ? { street: customer.ship_street1, city: customer.ship_city, postal_code: customer.ship_postal_code, country: customer.ship_country }
    : customer?.direccion_envio as any;
  const contactName = customer?.first_name
    ? `${customer.first_name} ${customer.last_name ?? ""}`.trim()
    : customer?.contacto_nombre ?? "—";
  const ref = id.slice(0, 8).toUpperCase();
  const dateStr = new Date(order.created_at).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>

      <BackLink href="/pedidos">ALL ORDERS</BackLink>

      {/* Hero header — Alexandria 56 ref + status + meta */}
      <div style={{
        marginTop: 12,
        background: '#111', color: '#fff',
        padding: '24px 28px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...monoLabel, color: FR.yellow }}>● ORDER · {dateStr}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
              fontWeight: 900, fontSize: 56, lineHeight: 0.9,
              letterSpacing: '-0.04em', color: '#fff',
            }}>
              #{ref}
            </div>
            <StatusChip status={order.status as FRStatus} size="lg" />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#aaa', letterSpacing: '0.06em' }}>
            {contactName.toUpperCase()} · {(order.customer?.company_name ?? '').toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={`/api/orders/${id}/packslip`} target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost" style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, letterSpacing: '0.14em', padding: '8px 14px' }}>↓ PACKSLIP</button>
          </a>
          <OrderActions orderId={id} status={order.status} />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="fr-order-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
        <style>{`@media(min-width:900px){.fr-order-grid{grid-template-columns:1fr 320px!important}}`}</style>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Order items */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHeader}>▣ ORDER ITEMS / {order.order_items?.length ?? 0}</div>

            {/* Mobile: cards */}
            <div className="fr-items-mobile">
              <style>{`@media(min-width:600px){.fr-items-mobile{display:none!important}.fr-items-table{display:block!important}}`}</style>
              {order.order_items?.map((item, i) => (
                <div key={item.id} style={{
                  padding: '14px 16px',
                  borderBottom: i < order.order_items.length - 1 ? 'var(--border-light)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nombre_producto}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', marginTop: 2 }}>
                      {item.sku} · {item.peso_unitario}KG/U
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em' }}>
                      {fmt(item.cantidad * item.precio_unitario)}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>
                      {item.cantidad} × {fmt(item.precio_unitario)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: dark-headed grid */}
            <div className="fr-items-table" style={{ display: 'none' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 110px 60px 80px 110px 130px',
                background: '#111', color: '#fff',
                padding: '12px 16px', gap: 12, alignItems: 'center',
              }}>
                {['PRODUCT', 'SKU', 'QTY', 'WEIGHT', 'UNIT', 'SUBTOTAL'].map(h => (
                  <div key={h} style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.16em' }}>{h}</div>
                ))}
              </div>
              {order.order_items?.map((item, i) => (
                <div key={item.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 110px 60px 80px 110px 130px',
                  padding: '14px 16px', gap: 12, alignItems: 'center',
                  borderBottom: i < order.order_items.length - 1 ? 'var(--border-light)' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nombre_producto}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>{item.sku}</div>
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 18 }}>{item.cantidad}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11 }}>{item.peso_unitario}KG</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11 }}>{fmt(item.precio_unitario)}</div>
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(item.cantidad * item.precio_unitario)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals strip — dark footer */}
            <div style={{ background: '#111', color: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['PRODUCT SUBTOTAL', fmt(order.total_productos)],
                ['EST. SHIPPING', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ...(order.coste_envio_final ? [['FINAL SHIPPING', fmt(order.coste_envio_final)]] : []),
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', letterSpacing: '0.14em' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: '#ddd' }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, marginTop: 4, borderTop: '1px solid #333' }}>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: FR.yellow, letterSpacing: '0.18em' }}>TOTAL</span>
                <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 36, letterSpacing: '-0.04em', color: FR.yellow }}>
                  {fmt(order.total_productos)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipment panel */}
          {order.status === 'listo_envio' && (
            <div style={{ border: '2px solid', borderColor: FR.red, background: '#fff' }}>
              <div style={{ ...sectionHeader, background: FR.red }}>▶ GENERATE SHIPMENT</div>
              <div style={{ padding: 16 }}>
                <ShipmentPanel orderId={id} pesoTotal={order.peso_total} destination={address} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Status timeline */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHeader}>◷ STATUS</div>
            <div style={{ padding: '16px 18px' }}>
              {STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const dotBg = isCurrent ? FR.red : isDone ? '#111' : '#fff';
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, position: 'relative' }}>
                    {i < STATUS_ORDER.length - 1 && (
                      <div style={{ position: 'absolute', left: 5, top: 14, width: 2, height: '100%', background: isDone ? '#111' : '#ddd6c8' }} />
                    )}
                    <div style={{
                      width: 12, height: 12, flexShrink: 0,
                      border: 'var(--border-dash)', background: dotBg,
                      position: 'relative', zIndex: 1,
                    }} />
                    <div style={{
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: isCurrent ? '#111' : isDone ? '#555' : '#bbb',
                    }}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={{ ...sectionHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>◈ LOGISTICS</span>
              {order.status === 'enviado' && order.packlink_shipment_id && (
                <form action={`/api/orders/${id}/tracking`} method="POST">
                  <button type="submit" style={{ background: 'transparent', border: '1px solid #fff', color: FR.yellow, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, padding: '4px 8px', boxShadow: 'none' }}>
                    ↻ UPDATE
                  </button>
                </form>
              )}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['EST. SHIPPING', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ['FINAL SHIPPING', order.coste_envio_final ? fmt(order.coste_envio_final) : '—'],
                ['SHIPMENT ID', order.packlink_shipment_id ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={monoLabel}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
              {order.tracking_url && (
                <div style={{ paddingTop: 10, borderTop: 'var(--border-light)' }}>
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: FR.red,
                  }}>
                    VIEW TRACKING ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={{ ...sectionHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>◉ CLIENT</span>
              <Link href={`/clientes/${order.customer?.id}`} style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                color: FR.yellow, textTransform: 'uppercase',
              }}>VIEW ↗</Link>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['NAME', contactName ?? '—'],
                ['COMPANY', order.customer?.company_name ?? '—'],
                ['EMAIL', order.customer?.email ?? '—'],
                ['PHONE', order.customer?.telefono ?? '—'],
                ['ADDRESS', address ? `${address.street}, ${address.postal_code} ${address.city}` : '—'],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={monoLabel}>{label}</span>
                  <span style={{ fontSize: 12, color: '#111', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
