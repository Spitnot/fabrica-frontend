'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', confirmado: 'Confirmado', produccion: 'En Producción',
  listo_envio: 'Listo para Envío', enviado: 'Enviado', cancelado: 'Cancelado',
};
const STATUS_STYLES: Record<string, string> = {
  draft:       'text-zinc-400 bg-zinc-800 border-zinc-700',
  confirmado:  'text-sky-300 bg-sky-950 border-sky-800',
  produccion:  'text-amber-300 bg-amber-950 border-amber-800',
  listo_envio: 'text-violet-300 bg-violet-950 border-violet-800',
  enviado:     'text-emerald-300 bg-emerald-950 border-emerald-800',
  cancelado:   'text-red-400 bg-red-950 border-red-900',
};
const STATUS_ORDER = ['confirmado', 'produccion', 'listo_envio', 'enviado'];

export default function PortalPedidoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) { setError('No autenticado'); setLoading(false); return; }

      // Buscar customer del usuario
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!customer) { setError('Cliente no encontrado'); setLoading(false); return; }

      // Leer pedido — RLS garantiza que solo ve los suyos
      const { data: order, error } = await supabaseClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .eq('customer_id', customer.id)
        .single();

      if (error || !order) { setError('Pedido no encontrado'); setLoading(false); return; }

      setOrder(order);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-7 flex items-center gap-2 text-zinc-600 text-sm">
        <div className="w-4 h-4 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
        Cargando…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-7">
        <div className="text-sm text-red-400">{error || 'Pedido no encontrado'}</div>
        <Link href="/portal" className="text-xs text-amber-400 mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Mis Pedidos
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-xs text-zinc-500">{order.id}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[order.status]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {order.tracking_url && (
          <a
            href={order.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 transition-colors"
          >
            Seguir envío →
          </a>
        )}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">

        {/* LEFT — líneas de pedido */}
        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">Productos</span>
              <div className="flex-1 h-px bg-[#282828]" />
            </div>
            <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 border-b border-[#282828]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-[#1f1f1f] last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-200">{item.nombre_producto}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{item.sku}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-300 text-center">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{fmt(item.precio_unitario)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-200 text-right">
                        {fmt(item.cantidad * item.precio_unitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="px-4 py-4 border-t border-[#282828] space-y-2">
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Subtotal productos</span>
                  <span>{fmt(order.total_productos)}</span>
                </div>
                {(order.coste_envio_final ?? order.coste_envio_estimado) && (
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Envío</span>
                    <span>{fmt(order.coste_envio_final ?? order.coste_envio_estimado)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#282828]">
                  <span className="font-semibold text-sm text-zinc-200">Total</span>
                  <span className="text-lg font-bold text-amber-400">
                    {fmt(order.total_productos + (order.coste_envio_final ?? order.coste_envio_estimado ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT — timeline + logística */}
        <div className="space-y-4">

          {/* Timeline */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Estado del pedido</span>
            </div>
            <div className="p-4">
              {STATUS_ORDER.map((s, i) => {
                const isDone    = i < currentIdx;
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

          {/* Logística */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Envío</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Peso',         `${order.peso_total} kg`],
                ['Coste envío',  order.coste_envio_final ? fmt(order.coste_envio_final) : order.coste_envio_estimado ? fmt(order.coste_envio_estimado) : '—'],
                ['Referencia',   order.packlink_shipment_id ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="font-mono text-xs text-zinc-300">{value}</span>
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
        </div>
      </div>
    </div>
  );
}
