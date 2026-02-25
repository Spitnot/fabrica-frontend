import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';

async function getStats() {
  const [
    { count: activos },
    { count: listos },
    { count: enviados },
    { data: facturacion },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).in('status', ['confirmado', 'produccion']),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'listo_envio'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'enviado')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabaseAdmin.from('orders').select('total_productos').in('status', ['confirmado', 'produccion', 'listo_envio', 'enviado'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const facturacionMes = (facturacion ?? []).reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  return { activos: activos ?? 0, listos: listos ?? 0, enviados: enviados ?? 0, facturacionMes };
}

async function getRecentOrders() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, created_at, customer:customers(contacto_nombre, company_name)')
    .order('created_at', { ascending: false })
    .limit(8);
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

const mes = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

export default async function DashboardPage() {
  const [stats, orders] = await Promise.all([getStats(), getRecentOrders()]);

  const cards = [
    { label: 'Active Orders',      value: stats.activos,            sub: 'Confirmed or in production', color: '#0087B8' },
    { label: 'Ready to Ship',      value: stats.listos,             sub: 'Pending Packlink label',     color: '#876693' },
    { label: 'Shipped This Month', value: stats.enviados,           sub: mes,                          color: '#0DA265' },
    { label: 'Monthly Revenue',    value: fmt(stats.facturacionMes), sub: mes,                          color: '#D93A35' },
  ];

  return (
    <div className="p-6 md:p-7">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>
            Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">General overview</p>
        </div>
        <Link
          href="/pedidos/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-2">
              {card.label}
            </div>
            <div className="text-2xl font-black tracking-tight" style={{ color: card.color, fontFamily: 'var(--font-alexandria)' }}>
              {card.value}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.14em] uppercase text-gray-900"
                style={{ fontFamily: 'var(--font-alexandria)' }}>
            Recent Orders
          </span>
          <Link href="/pedidos" className="text-xs text-[#D93A35] hover:text-[#b52e2a] font-semibold transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-50">
                {['Client', 'Status', 'Amount', 'Date'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
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
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[o.status]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                      {fmt(o.total_productos)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleDateString('en-GB', {
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
    </div>
  );
}
