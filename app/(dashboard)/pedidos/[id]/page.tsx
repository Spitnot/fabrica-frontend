import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';
import { ShipmentPanel } from './ShipmentPanel';

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
const STATUS_STYLES: Record<string, string> = {
  draft:       'text-gray-500 bg-gray-100 border-gray-200',
  confirmado:  'text-[#0087B8] bg-blue-50 border-blue-200',
  produccion:  'text-[#b85e00] bg-orange-50 border-orange-200',
  listo_envio: 'text-[#876693] bg-purple-50 border-purple-200',
  enviado:     'text-[#0DA265] bg-green-50 border-green-200',
  cancelado:   'text-[#D93A35] bg-red-50 border-red-200',
};
const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'enviado'];
const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af', confirmado: '#0087B8', produccion: '#E6883E',
  listo_envio: '#876693', enviado: '#0DA265',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

interface Props { params: Promise<{ id: string }> }

export default async function PedidoDetallePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const address = order.customer?.direccion_envio as any;

  return (
    <div className="p-6 md:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-gray-400">{order.id}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[order.status]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {order.customer?.contacto_nombre} · {order.customer?.company_name} ·{' '}
            {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <a
            href={`/api/orders/${id}/packslip`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            ↓ Packslip
          </a>
          {order.status === 'confirmado' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="produccion" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-orange-300 hover:text-[#b85e00] transition-colors">
                → Move to Production
              </button>
            </form>
          )}
          {order.status === 'produccion' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="listo_envio" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-purple-300 hover:text-[#876693] transition-colors">
                → Mark Ready to Ship
              </button>
            </form>
          )}
          {order.status !== 'cancelado' && order.status !== 'enviado' && order.status !== 'listo_envio' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="cancelado" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-[#D93A35] border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5">

        {/* LEFT */}
        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">Commercial Info</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  ['Client',     order.customer?.contacto_nombre ?? '—'],
                  ['Company',    order.customer?.company_name ?? '—'],
                  ['Total weight', `${order.peso_total} kg`],
                  ['Created',    new Date(order.created_at).toLocaleDateString('en-GB')],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">{label}</div>
                    <div className="text-sm font-semibold text-gray-900">{value as string}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Product', 'SKU', 'Qty', 'Weight', 'Unit Price', 'Subtotal'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items?.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 px-3 text-sm font-medium text-gray-900">{item.nombre_producto}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-400">{item.sku}</td>
                        <td className="py-2.5 px-3 font-mono text-sm text-gray-700 text-center">{item.cantidad}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-400">{item.peso_unitario} kg</td>
                        <td className="py-2.5 px-3 text-sm text-gray-700">{fmt(item.precio_unitario)}</td>
                        <td className="py-2.5 px-3 text-sm font-semibold text-gray-900 text-right">{fmt(item.cantidad * item.precio_unitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {[
                  ['Product subtotal', fmt(order.total_productos)],
                  ['Estimated shipping', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                  ...(order.coste_envio_final ? [['Final shipping', fmt(order.coste_envio_final)]] : []),
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm text-gray-500">
                    <span>{label}</span><span>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-sm text-gray-900">Total</span>
                  <span className="text-lg font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>
                    {fmt(order.total_productos)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {order.status === 'listo_envio' && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">Generate Shipment</span>
                <div className="flex-1 h-px bg-[#D93A35]/20" />
              </div>
              <ShipmentPanel orderId={id} pesoTotal={order.peso_total} destination={address} />
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Status</span>
            </div>
            <div className="p-4">
              {STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const color = STATUS_COLORS[s];
                return (
                  <div key={s} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                    {i < STATUS_ORDER.length - 1 && (
                      <div className="absolute left-[4px] top-[10px] w-px h-full"
                        style={{ background: isDone ? `${color}40` : '#e5e7eb' }} />
                    )}
                    <div className="relative z-10 w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                         style={{
                           background: isCurrent ? color : isDone ? color : '#e5e7eb',
                           boxShadow: isCurrent ? `0 0 0 3px ${color}20` : 'none',
                         }} />
                    <div className="text-[13px] font-medium"
                         style={{ color: isCurrent ? color : isDone ? '#374151' : '#9ca3af' }}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Logistics</span>
              {order.status === 'enviado' && order.packlink_shipment_id && (
                <form action={`/api/orders/${id}/tracking`} method="POST">
                  <button type="submit" className="text-[10px] font-semibold text-gray-400 hover:text-[#D93A35] transition-colors">
                    ↻ Update tracking
                  </button>
                </form>
              )}
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Est. shipping', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ['Final shipping', order.coste_envio_final ? fmt(order.coste_envio_final) : '—'],
                ['Shipment ID', order.packlink_shipment_id ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-mono text-xs text-gray-700">{value}</span>
                </div>
              ))}
              {order.tracking_url && (
                <div className="pt-2 border-t border-gray-100">
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#0087B8] underline underline-offset-2">
                    View tracking →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Client</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Name',    order.customer?.contacto_nombre ?? '—'],
                ['Company', order.customer?.company_name ?? '—'],
                ['Email',   order.customer?.email ?? '—'],
                ['Phone',   order.customer?.telefono ?? '—'],
                ['Address', address ? `${address.street}, ${address.postal_code} ${address.city}` : '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm gap-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-700 font-medium text-right text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
