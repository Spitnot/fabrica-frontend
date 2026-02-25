import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer, OrderItem } from '@/types';
import { ShipmentPanel } from './ShipmentPanel';

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
  draft: 'Borrador', confirmado: 'Confirmado', produccion: 'En Producción',
  listo_envio: 'Listo para Envío', enviado: 'Enviado', cancelado: 'Cancelado',
};
const STATUS_STYLES: Record<string, string> = {
  draft: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  confirmado: 'text-sky-300 bg-sky-950 border-sky-800',
  produccion: 'text-amber-300 bg-amber-950 border-amber-800',
  listo_envio: 'text-violet-300 bg-violet-950 border-violet-800',
  enviado: 'text-emerald-300 bg-emerald-950 border-emerald-800',
  cancelado: 'text-red-400 bg-red-950 border-red-900',
};
const STATUS_ORDER = ['draft', 'confirmado', 'produccion', 'listo_envio', 'enviado'];

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
    <div className="p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-zinc-500">{order.id}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[order.status]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            {order.customer?.contacto_nombre} · {order.customer?.company_name} ·{' '}
            {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {order.status === 'confirmado' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="produccion" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-[#1c1c1c] border border-[#333] rounded-md text-zinc-300 hover:border-amber-500/50 transition-colors">
                → Mover a Producción
              </button>
            </form>
          )}
          {order.status === 'produccion' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="listo_envio" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-[#1c1c1c] border border-[#333] rounded-md text-zinc-300 hover:border-amber-500/50 transition-colors">
                → Marcar Listo para Envío
              </button>
            </form>
          )}
          {order.status !== 'cancelado' && order.status !== 'enviado' && order.status !== 'listo_envio' && (
            <form action={`/api/orders/${id}/status`} method="POST">
              <input type="hidden" name="status" value="cancelado" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-900 rounded-md hover:bg-red-950 transition-colors">
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* LEFT */}
        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">Información Comercial</span>
              <div className="flex-1 h-px bg-[#282828]" />
            </div>
            <div className="bg-[#141414] border border-[#282828] rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  ['Cliente',    order.customer?.contacto_nombre ?? '—'],
                  ['Empresa',    order.customer?.company_name ?? '—'],
                  ['Peso total', `${order.peso_total} kg`],
                  ['Creado',     new Date(order.created_at).toLocaleDateString('es-ES')],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1">{label}</div>
                    <div className="text-sm font-medium text-zinc-200">{value as string}</div>
                  </div>
                ))}
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Producto', 'SKU', 'Cant.', 'Peso unit.', 'P. Unit.', 'Subtotal'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 border-b border-[#282828]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item) => (
                    <tr key={item.id} className="border-b border-[#1f1f1f] last:border-0">
                      <td className="py-2.5 px-3 text-sm font-medium text-zinc-200">{item.nombre_producto}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-zinc-500">{item.sku}</td>
                      <td className="py-2.5 px-3 font-mono text-sm text-zinc-300 text-center">{item.cantidad}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-zinc-400">{item.peso_unitario} kg</td>
                      <td className="py-2.5 px-3 text-sm text-zinc-300">{fmt(item.precio_unitario)}</td>
                      <td className="py-2.5 px-3 text-sm font-semibold text-zinc-200 text-right">{fmt(item.cantidad * item.precio_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-[#282828] space-y-2">
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Subtotal productos</span>
                  <span>{fmt(order.total_productos)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Envío estimado</span>
                  <span>{order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'}</span>
                </div>
                {order.coste_envio_final && (
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Envío final</span>
                    <span>{fmt(order.coste_envio_final)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#282828]">
                  <span className="font-semibold text-sm text-zinc-200">Total productos</span>
                  <span className="text-lg font-bold text-amber-400">{fmt(order.total_productos)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Panel de envío — solo visible en listo_envio */}
          {order.status === 'listo_envio' && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">Generar Envío</span>
                <div className="flex-1 h-px bg-amber-400/30" />
              </div>
              <ShipmentPanel
                orderId={id}
                pesoTotal={order.peso_total}
                destination={address}
              />
            </section>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Estado</span>
            </div>
            <div className="p-4">
              {STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                    {i < STATUS_ORDER.length - 1 && (
                      <div className="absolute left-[4px] top-[10px] w-px h-full"
                        style={{ background: isDone ? 'rgba(245,158,11,0.3)' : '#282828' }} />
                    )}
                    <div className={`relative z-10 w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                      isCurrent ? 'bg-amber-400 ring-2 ring-amber-400/20' : isDone ? 'bg-amber-500' : 'bg-[#333]'
                    }`} />
                    <div className={`text-[13px] font-medium ${
                      isCurrent ? 'text-amber-400' : isDone ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logística — con botón actualizar tracking */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Logística</span>
              {order.status === 'enviado' && order.packlink_shipment_id && (
                <form action={`/api/orders/${id}/tracking`} method="POST">
                  <button type="submit" className="text-[10px] font-semibold text-zinc-500 hover:text-amber-400 transition-colors">
                    ↻ Actualizar tracking
                  </button>
                </form>
              )}
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Envío estimado', order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ['Envío final',    order.coste_envio_final ? fmt(order.coste_envio_final) : '—'],
                ['Shipment ID',   order.packlink_shipment_id ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="font-medium text-zinc-300">{value}</span>
                </div>
              ))}
              {order.tracking_url && (
                <div className="pt-2 border-t border-[#282828]">
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-sky-400 underline underline-offset-2">
                    Ver seguimiento →
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Cliente</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Nombre',    order.customer?.contacto_nombre ?? '—'],
                ['Empresa',   order.customer?.company_name ?? '—'],
                ['Email',     order.customer?.email ?? '—'],
                ['Teléfono',  order.customer?.telefono ?? '—'],
                ['Dirección', address ? `${address.street}, ${address.postal_code} ${address.city}` : '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm gap-2">
                  <span className="text-zinc-500 flex-shrink-0">{label}</span>
                  <span className="text-zinc-300 font-medium text-right text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
