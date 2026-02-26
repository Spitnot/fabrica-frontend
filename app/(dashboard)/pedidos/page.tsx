import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';

async function getOrders() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, customer:customers(contacto_nombre, company_name)')
    .order('created_at', { ascending: false });
  if (error) { console.error('[orders]', error.message); return []; }
  return data ?? [];
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

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default async function PedidosPage() {
  const orders = await getOrders();

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/pedidos/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
          + New Order
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                {['Client', 'Status', 'Weight', 'Amount', 'Date'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/pedidos/${o.id}`} className="group">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-[#D93A35] transition-colors">
                          {o.customer?.contacto_nombre ?? '—'}
                        </div>
                        <div className="text-xs text-gray-400">{o.customer?.company_name}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[o.status] ?? STATUS_STYLES['draft']}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.peso_total} kg</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(o.total_productos)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
