// ─────────────────────────────────────────────────────────────
// PORTAL · ORDER DETAIL
// Server component — data logic preserved 1:1 from FIRMA_FRESH.
// Storefront-faithful surface: hairline rules, mono labels, red accent.
// ─────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';

export const dynamic = 'force-dynamic';

type OrderFull = Order & { customer: Customer; order_items: OrderItem[] };

async function getOrder(id: string): Promise<OrderFull | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, customer:customers(*), order_items(*)`)
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  draft:       '#000000',
  confirmado:  '#0087B8',
  produccion:  '#F6E451',
  listo_envio: '#876693',
  enviado:     '#0DA265',
  cancelado:   '#D93A35',
};
const STATUS_FG: Record<string, string> = {
  draft: '#fff', confirmado: '#fff', produccion: '#000',
  listo_envio: '#fff', enviado: '#fff', cancelado: '#fff',
};

const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'enviado'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Atoms ─────────────────────────────────────────────────

const ink = '#000';
const muted = '#6a6660';
const line = '#e5e2da';

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.22em',
      textTransform: 'uppercase', color: muted,
    }}>{children}</span>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: STATUS_COLOR[status],
      color: STATUS_FG[status],
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      fontWeight: 700, fontSize: 11, letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: STATUS_FG[status], opacity: 0.9,
      }} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function Card({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${ink}` }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <MonoLabel>{title}</MonoLabel>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 12, padding: '8px 0', borderBottom: `1px solid ${line}`,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
        fontSize: 11, color: muted, letterSpacing: '0.06em',
      }}>{label}</span>
      <span style={{
        fontFamily: mono
          ? 'var(--font-mono, "JetBrains Mono", monospace)'
          : 'var(--font-mono, "JetBrains Mono", monospace)',
        fontSize: 12, color: ink, fontWeight: 500, textAlign: 'right',
      }}>{value || '—'}</span>
    </div>
  );
}

interface Props { params: Promise<{ id: string }> }

export default async function PedidoDetallePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const c = order.customer as any;
  const address = c?.ship_street1
    ? { street: c.ship_street1, city: c.ship_city, postal_code: c.ship_postal_code, country: c.ship_country }
    : c?.direccion_envio as any;
  const contactName = c?.first_name ? `${c.first_name} ${c.last_name ?? ''}`.trim() : c?.contacto_nombre ?? '—';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Back link */}
      <Link
        href="/portal"
        style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: ink,
          textDecoration: 'underline', textUnderlineOffset: 3,
          textDecorationThickness: 1.5,
        }}>← My Orders</Link>

      {/* Header */}
      <header style={{ borderBottom: `2px solid ${ink}`, paddingBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          marginBottom: 12,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            color: muted,
          }}>FILE / {order.id.slice(0, 8).toUpperCase()}</span>
          <StatusChip status={order.status} />
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-display, Alexandria, sans-serif)',
          fontWeight: 900, fontSize: 'clamp(40px, 7vw, 84px)',
          lineHeight: 0.86, letterSpacing: '-0.04em',
          textTransform: 'uppercase', color: ink,
        }}>
          Order<span style={{ color: '#D93A35' }}>.</span>
        </h1>
        <div style={{
          marginTop: 12,
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: 12, color: ink,
        }}>
          {contactName} · {order.customer?.company_name} ·{' '}
          {new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }} className="fr-detail-grid">

        {/* LEFT — items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          <Card
            title="Commercial Info"
            action={
              <Link
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: '#D93A35',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  textDecorationThickness: 1.5,
                }}
              >↓ Invoice</Link>
            }
          >
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20,
            }}>
              {[
                ['Client', contactName ?? '—'],
                ['Company', order.customer?.company_name ?? '—'],
                ['Total Weight', `${order.peso_total} kg`],
                ['Created', new Date(order.created_at).toLocaleDateString('en-GB')],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: muted, marginBottom: 4,
                  }}>{label}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 13, fontWeight: 600, color: ink,
                  }}>{value as string}</div>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div style={{ borderTop: `1px solid ${ink}`, marginTop: 4 }}>
              {/* Desktop header */}
              <div className="fr-table-head" style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 60px 80px 90px 100px',
                gap: 12, padding: '10px 0',
                borderBottom: `1px solid ${ink}`,
              }}>
                {['Product', 'SKU', 'Qty', 'Weight', 'Unit', 'Subtotal'].map(h => (
                  <div key={h} style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: muted,
                    textAlign: ['Qty', 'Weight', 'Unit'].includes(h) ? 'center' :
                              h === 'Subtotal' ? 'right' : 'left',
                  }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {order.order_items?.map(item => (
                <div key={item.id}
                  className="fr-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 60px 80px 90px 100px',
                    gap: 12, padding: '12px 0',
                    borderBottom: `1px solid ${line}`, alignItems: 'center',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 13, fontWeight: 600, color: ink,
                  }}>{item.nombre_producto}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 11, color: muted,
                  }}>{item.sku}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 13, fontWeight: 700, color: ink, textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{item.cantidad}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 11, color: muted, textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{item.peso_unitario} kg</div>
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 12, color: ink, textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmt(item.precio_unitario)}</div>
                  <div style={{
                    fontFamily: 'var(--font-display, Alexandria, sans-serif)',
                    fontWeight: 800, fontSize: 16, color: ink, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmt(item.cantidad * item.precio_unitario)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${ink}` }}>
              {[
                ['Product Subtotal', fmt(order.total_productos)],
                ['Estimated Shipping', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ...(order.coste_envio_final ? [['Final Shipping', fmt(order.coste_envio_final)]] : []),
              ].map(([label, value]) => (
                <div key={label as string} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 12, color: muted,
                  }}>{label}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 12, color: ink, fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{value}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                paddingTop: 12, marginTop: 8, borderTop: `2px solid ${ink}`,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display, Alexandria, sans-serif)',
                  fontSize: 14, fontWeight: 800, color: ink,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>Total</span>
                <span style={{
                  fontFamily: 'var(--font-display, Alexandria, sans-serif)',
                  fontWeight: 900, fontSize: 32, color: '#D93A35',
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                }}>{fmt(order.total_productos)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Status timeline */}
          <Card title="Status">
            {STATUS_ORDER.map((s, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              const color = STATUS_COLOR[s];
              const isLast = i === STATUS_ORDER.length - 1;
              return (
                <div key={s} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '6px 0',
                  position: 'relative',
                }}>
                  {!isLast && (
                    <div style={{
                      position: 'absolute', left: 5, top: 18,
                      width: 1, height: 'calc(100% + 4px)',
                      background: isDone ? color : '#cfcbc0',
                    }} />
                  )}
                  <div style={{
                    width: 11, height: 11,
                    background: isCurrent ? color : isDone ? color : '#fff',
                    border: `2px solid ${isCurrent || isDone ? color : '#cfcbc0'}`,
                    flexShrink: 0, marginTop: 4, position: 'relative', zIndex: 1,
                  }} />
                  <div style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? color : isDone ? ink : muted,
                    letterSpacing: '0.04em',
                    paddingTop: 1,
                  }}>{STATUS_LABELS[s]}</div>
                </div>
              );
            })}
          </Card>

          {/* Logistics */}
          <Card
            title="Logistics"
            action={
              order.status === 'enviado' && order.packlink_shipment_id ? (
                <form action={`/api/orders/${id}/tracking`} method="POST">
                  <button type="submit" style={{
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: '#D93A35',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                    textDecorationThickness: 1.5,
                  }}>↻ Update</button>
                </form>
              ) : null
            }
          >
            <InfoRow
              label="EST. SHIPPING"
              value={order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'}
              mono
            />
            <InfoRow
              label="FINAL SHIPPING"
              value={order.coste_envio_final ? fmt(order.coste_envio_final) : '—'}
              mono
            />
            <InfoRow
              label="SHIPMENT ID"
              value={order.packlink_shipment_id ?? '—'}
              mono
            />
            {order.tracking_url && (
              <div style={{ paddingTop: 12, marginTop: 4, borderTop: `1px solid ${ink}` }}>
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontSize: 11, fontWeight: 700, color: '#0087B8',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  textDecorationThickness: 1.5, letterSpacing: '0.04em',
                }}>View tracking →</a>
              </div>
            )}
          </Card>

          {/* Client */}
          <Card title="Client">
            <InfoRow label="NAME" value={contactName ?? '—'} />
            <InfoRow label="COMPANY" value={order.customer?.company_name ?? '—'} />
            <InfoRow label="EMAIL" value={order.customer?.email ?? '—'} />
            <InfoRow label="PHONE" value={order.customer?.telefono ?? '—'} />
            <InfoRow
              label="ADDRESS"
              value={address ? `${address.street}, ${address.postal_code} ${address.city}` : '—'}
            />
          </Card>
        </aside>
      </div>

      {/* Mobile rules — collapse to single column under 900px */}
      <style>{`
        @media (max-width: 900px) {
          .fr-detail-grid { grid-template-columns: 1fr !important; }
          .fr-table-head { display: none !important; }
          .fr-row {
            grid-template-columns: 1fr auto !important;
            grid-template-areas:
              "name subtotal"
              "sku  qty"
              "weight unit" !important;
            row-gap: 4px !important;
          }
          .fr-row > *:nth-child(1) { grid-area: name; }
          .fr-row > *:nth-child(2) { grid-area: sku; }
          .fr-row > *:nth-child(3) { grid-area: qty; text-align: right !important; }
          .fr-row > *:nth-child(4) { grid-area: weight; text-align: left !important; }
          .fr-row > *:nth-child(5) { grid-area: unit; text-align: right !important; }
          .fr-row > *:nth-child(6) { grid-area: subtotal; }
        }
      `}</style>
    </div>
  );
}
