import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, Customer } from '@/types';

type OrderWithCustomer = Order & { customer: Customer };

async function getOrders(): Promise<OrderWithCustomer[]> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      customer:customers(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[pedidos]', error.message);
    return [];
  }
  return data ?? [];
}

const STATUS_LABELS: Record<string, string> = {
  draft:       'Borrador',
  confirmado:  'Confirmado',
  produccion:  'En Producción',
  listo_envio: 'Listo para Envío',
  enviado:     'Enviado',
  cancelado:   'Cancelado',
};

const STATUS_STYLES: Record<string, string> = {
  draft:       'text-zinc-400 bg-zinc-800 border-zinc-700',
  confirmado:  'text-sky-300 bg-sky-950 border-sky-800',
  produccion:  'text-amber-300 bg-amber-950 border-amber-800',
  listo_envio: 'text-violet-300 bg-violet-950 border-violet-800',
  enviado:     'text-emerald-300 bg-emerald-950 border-emerald-800',
  cancelado:   'text-red-400 bg-red-950 border-red-900',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default async function PedidosPage() {
  const orders = await getOrders();

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Pedidos</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link
          href="/pedidos/nuevo"
          className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 transition-colors"
        >
          + Nuevo Pedido
        </Link>
      </div>

      <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['ID', 'Cliente', 'Estado', 'Peso', 'Total', 'Envío', 'Fecha'].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 border-b border-[#282828]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-600">
                  No hay pedidos todavía
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/pedidos/${o.id}`}
                      className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {o.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-zinc-200">
                      {o.customer?.contacto_nombre ?? '—'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {o.customer?.company_name ?? ''}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[o.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-400">
                    {o.peso_total} kg
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-zinc-200">
                    {fmt(o.total_productos)}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400">
                    {o.coste_envio_estimado ? fmt(o.coste_envio_estimado) : '—'}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                    {new Date(o.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
