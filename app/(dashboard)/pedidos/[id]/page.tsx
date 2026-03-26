import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';
import { ShipmentPanel } from './ShipmentPanel';
import { OrderActions } from './OrderActions';
import Link from 'next/link';

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

const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'enviado'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const S: React.CSSProperties = {}; // shorthand for inline style typing

interface Props { params: Promise<{ id: string }> }

export default async function PedidoDetallePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const address = order.customer?.direccion_envio as any;
  const ref = `#${id.slice(0, 8).toUpperCase()}`;

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Back */}
      <Link href="/pedidos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 16, textDecoration: 'none' }}>
        ← Orders
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="page-title">{ref}</div>
            <span className="badge" style={{ background: STATUS_COLORS[order.status] ?? '#999' }}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            {order.customer?.contacto_nombre} · {order.customer?.company_name} · {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={`/api/orders/${id}/packslip`} target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost" style={{ fontSize: 9 }}>↓ Packslip</button>
          </a>
          <OrderActions orderId={id} status={order.status} />
        </div>
      </div>

      {/* Content — stack on mobile, 2col on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="fr-order-grid">
        <style>{`@media(min-width:768px){.fr-order-grid{grid-template-columns:1fr 280px!important}}`}</style>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Order items */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #111' }}>
              <span className="section-label">Order Items</span>
            </div>

            {/* Mobile: cards */}
            <div className="fr-items-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
              <style>{`@media(min-width:600px){.fr-items-mobile{display:none!important}.fr-items-table{display:block!important}}`}</style>
              {order.order_items?.map((item, i) => (
                <div key={item.id} style={{ padding: '12px 16px', borderBottom: i < order.order_items.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{item.nombre_producto}</div>
                    <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{item.sku} · {item.peso_unitario} kg/u</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>{fmt(item.cantidad * item.precio_unitario)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>{item.cantidad} × {fmt(item.precio_unitario)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="fr-items-table" style={{ display: 'none', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                    {['Product', 'SKU', 'Qty', 'Weight', 'Unit price', 'Subtotal'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: i < order.order_items.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: '#111' }}>{item.nombre_producto}</td>
                      <td style={{ padding: '9px 14px', fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{item.sku}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#111', textAlign: 'center' }}>{item.cantidad}</td>
                      <td style={{ padding: '9px 14px', fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{item.peso_unitario} kg</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: '#555' }}>{fmt(item.precio_unitario)}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 900, color: '#111', textAlign: 'right' }}>{fmt(item.cantidad * item.precio_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Product subtotal', fmt(order.total_productos)],
                ['Est. shipping', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ...(order.coste_envio_final ? [['Final shipping', fmt(order.coste_envio_final)]] : []),
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#777' }}>
                  <span>{label}</span><span>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #eee' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#D93A35' }}>{fmt(order.total_productos)}</span>
              </div>
            </div>
          </div>

          {/* Shipment panel */}
          {order.status === 'listo_envio' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid #D93A35' }}>
                <span className="section-label" style={{ color: '#D93A35' }}>Generate Shipment</span>
              </div>
              <div style={{ padding: 16 }}>
                <ShipmentPanel orderId={id} pesoTotal={order.peso_total} destination={address} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Status timeline */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee' }}>
              <span className="section-label">Status</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const color = STATUS_COLORS[s];
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 12, position: 'relative' }}>
                    {i < STATUS_ORDER.length - 1 && (
                      <div style={{ position: 'absolute', left: 4, top: 12, width: 1, height: '100%', background: isDone ? `${color}60` : '#e5e5e5' }} />
                    )}
                    <div style={{ width: 9, height: 9, flexShrink: 0, marginTop: 3, border: `2px solid ${isCurrent || isDone ? color : '#ddd'}`, background: isCurrent ? color : isDone ? `${color}40` : 'transparent', position: 'relative', zIndex: 1 }} />
                    <div style={{ fontSize: 12, fontWeight: isCurrent ? 900 : 400, color: isCurrent ? color : isDone ? '#555' : '#bbb', letterSpacing: '0.03em' }}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-label">Logistics</span>
              {order.status === 'enviado' && order.packlink_shipment_id && (
                <form action={`/api/orders/${id}/tracking`} method="POST">
                  <button type="submit" className="btn-ghost" style={{ fontSize: 8, padding: '3px 8px', boxShadow: 'none' }}>↻ Update</button>
                </form>
              )}
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Est. shipping', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ['Final shipping', order.coste_envio_final ? fmt(order.coste_envio_final) : '—'],
                ['Shipment ID', order.packlink_shipment_id ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#aaa' }}>{label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              {order.tracking_url && (
                <div style={{ paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#0087B8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    View tracking →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-label">Client</span>
              <Link href={`/clientes/${order.customer?.id}`} style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35' }}>
                View →
              </Link>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Name', order.customer?.contacto_nombre ?? '—'],
                ['Company', order.customer?.company_name ?? '—'],
                ['Email', order.customer?.email ?? '—'],
                ['Phone', order.customer?.telefono ?? '—'],
                ['Address', address ? `${address.street}, ${address.postal_code} ${address.city}` : '—'],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#aaa', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#555', fontWeight: 600, textAlign: 'right', fontSize: 10 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
