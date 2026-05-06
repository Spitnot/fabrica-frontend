import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';
import { ShipmentPanel } from './ShipmentPanel';
import { OrderActions } from './OrderActions';
import Link from 'next/link';
import { FR } from '@/components/fr/Atoms';
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
  listo_envio: 'Ready to Ship', esperando_pago: 'Awaiting Payment', enviado: 'Shipped', cancelado: 'Cancelled',
};
const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'esperando_pago', 'enviado'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

interface Props { params: Promise<{ id: string }> }

export default async function PedidoDetallePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const customer = order.customer as any;
  const address = customer?.ship_street1
    ? { street: customer.ship_street1 ?? '', city: customer.ship_city ?? '', postal_code: customer.ship_postal_code ?? '', country: customer.ship_country ?? 'ES' }
    : customer?.direccion_envio as any;
  const contactName = customer?.first_name
    ? `${customer.first_name} ${customer.last_name ?? ''}`.trim()
    : customer?.contacto_nombre ?? '—';
  const ref = id.slice(0, 8).toUpperCase();
  const dateStr = new Date(order.created_at).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="fr-page">

      {/* Back */}
      <Link
        href="/pedidos"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#111', textDecoration: 'none' }}
      >
        ← ALL ORDERS
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.1em', marginBottom: 4 }}>
            ORDER · {dateStr}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 48, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
              #{ref}
            </div>
            <StatusChip status={order.status as FRStatus} size="lg" />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.06em', marginTop: 6 }}>
            {contactName.toUpperCase()} · {(order.customer?.company_name ?? '').toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={`/api/pedidos/${id}/packslip`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, letterSpacing: '0.14em', padding: '8px 14px', textDecoration: 'none' }}
          >
            ↓ PACKSLIP
          </a>
          <OrderActions orderId={id} status={order.status} />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="fr-order-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <style>{`@media(min-width:900px){.fr-order-grid{grid-template-columns:1fr 320px!important}}`}</style>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Order items */}
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">▣ ORDER ITEMS / {order.order_items?.length ?? 0}</div>

            {/* Mobile: cards */}
            <div className="fr-items-mobile">
              <style>{`@media(min-width:600px){.fr-items-mobile{display:none!important}.fr-items-table{display:block!important}}`}</style>
              {order.order_items?.map((item, i) => (
                <div key={item.id} style={{
                  padding: '14px 16px',
                  borderBottom: i < order.order_items.length - 1 ? '1px solid #111' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nombre_producto}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', marginTop: 2 }}>
                      {item.sku} · {item.peso_unitario}KG/U
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em' }}>
                      {fmt(item.cantidad * item.precio_unitario)}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111' }}>
                      {item.cantidad} × {fmt(item.precio_unitario)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="fr-items-table" style={{ display: 'none' }}>
              <div className="fr-table-head" style={{ gridTemplateColumns: '2fr 110px 60px 80px 110px 130px' }}>
                {['PRODUCT', 'SKU', 'QTY', 'WEIGHT', 'UNIT', 'SUBTOTAL'].map(h => (
                  <div key={h} className="fr-label">{h}</div>
                ))}
              </div>
              {order.order_items?.map((item, i) => (
                <div key={item.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 110px 60px 80px 110px 130px',
                  padding: '14px 16px', gap: 12, alignItems: 'center',
                  borderBottom: i < order.order_items.length - 1 ? '1px solid #111' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nombre_producto}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111' }}>{item.sku}</div>
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 18 }}>{item.cantidad}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11 }}>{item.peso_unitario}KG</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11 }}>{fmt(item.precio_unitario)}</div>
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(item.cantidad * item.precio_unitario)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals strip */}
            <div style={{ borderTop: '1px solid #111', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['PRODUCT SUBTOTAL', fmt(order.total_productos)],
                ['EST. SHIPPING', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ...(order.coste_envio_final ? [['FINAL SHIPPING', fmt(order.coste_envio_final)]] : []),
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.14em' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, marginTop: 2, borderTop: '1px solid rgba(17,17,17,0.15)' }}>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(17,17,17,0.5)' }}>TOTAL</span>
                <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 32, letterSpacing: '-0.04em', color: FR.red }}>
                  {fmt(order.total_productos)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipment panel — solo disponible en listo_envio */}
          {order.status === 'listo_envio' && (
            <div className="fr-card" style={{ overflow: 'hidden' }}>
              <div className="fr-section-head" style={{ background: FR.red, color: '#fff', borderBottom: `1px solid ${FR.red}` }}>
                ▶ GENERATE SHIPMENT
              </div>
              <div style={{ padding: 16 }}>
                <ShipmentPanel orderId={id} pesoTotal={order.peso_total} destination={address} />
              </div>
            </div>
          )}

          {/* Aviso cuando el cliente ya ha sido notificado */}
          {order.status === 'esperando_pago' && (
            <div className="fr-card" style={{ overflow: 'hidden' }}>
              <div className="fr-section-head" style={{ background: '#E6883E', color: '#fff', borderBottom: '1px solid #E6883E' }}>
                ◎ AWAITING CLIENT PAYMENT
              </div>
              <div style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111', lineHeight: 1.6 }}>
                El cliente ha sido notificado por email. El pedido pasará a <strong>SHIPPED</strong> automáticamente cuando complete el pago.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Status timeline */}
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">◷ STATUS</div>
            <div style={{ padding: '16px 18px' }}>
              {STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const dotBg = isCurrent ? FR.red : isDone ? '#111' : '#fff';
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, position: 'relative' }}>
                    {i < STATUS_ORDER.length - 1 && (
                      <div style={{ position: 'absolute', left: 5, top: 14, width: 2, height: '100%', background: isDone ? '#111' : 'rgba(17,17,17,0.15)' }} />
                    )}
                    <div style={{
                      width: 12, height: 12, flexShrink: 0,
                      border: '1px solid #111', background: dotBg,
                      position: 'relative', zIndex: 1,
                    }} />
                    <div style={{
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: isCurrent ? '#111' : isDone ? '#111' : 'rgba(17,17,17,0.35)',
                    }}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 4 }}>
                <OrderActions orderId={id} status={order.status} />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">
              <span>◈ LOGISTICS</span>
              {order.status === 'enviado' && order.packlink_shipment_id && (
                <form action={`/api/pedidos/${id}/tracking`} method="POST" style={{ margin: 0 }}>
                  <button type="submit" className="btn-ghost" style={{ fontSize: 9, padding: '3px 8px', boxShadow: 'none' }}>
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
                <div key={String(label)} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="fr-label">{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
              {order.tracking_url && (
                <div style={{ paddingTop: 10, borderTop: '1px solid #111' }}>
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
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">
              <span>◉ CLIENT</span>
              <Link href={`/clientes/${order.customer?.id}`} style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                color: FR.red, textTransform: 'uppercase',
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
                  <span className="fr-label">{label}</span>
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
