import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';

async function getStats() {
  const [
    { count: activos },
    { count: listos },
    { count: enviados },
    { data: facturacion },
  ] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmado', 'produccion']),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'listo_envio'),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'enviado')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabaseAdmin
      .from('orders')
      .select('total_productos')
      .in('status', ['confirmado', 'produccion', 'listo_envio', 'enviado'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const facturacionMes = (facturacion ?? []).reduce(
    (s: number, o: any) => s + (o.total_productos ?? 0), 0
  );

  return {
    activos:       activos ?? 0,
    listos:        listos ?? 0,
    enviados:      enviados ?? 0,
    facturacionMes,
  };
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

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const mes = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

export default async function DashboardPage() {
  const [stats, orders] = await Promise.all([getStats(), getRecentOrders()]);

  const cards = [
    { label: 'Pedidos activos',   value: stats.activos,       sub: 'Confirmados o en producción' },
    { label: 'Listos para envío', value: stats.listos,        sub: 'Requieren etiqueta Packlink' },
    { label: 'Enviados este mes', value: stats.enviados,      sub: mes },
    { label: 'Facturación mes',   value: fmt(stats.facturacionMes), sub: mes },
  ];

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">Visión general del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#141414] border border-[#282828] rounded-lg p-5">
            <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-zinc-500 mb-2">
              {card.label}
            </div>
            <div className="text-2xl font-bold tracking-tight text-zinc-200">
              {card.value}
            </div>
            <div className="text-xs text-zinc-600 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Pedidos recientes */}
      <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#282828] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">
            Pedidos recientes
          </span>
          <Link href="/pedidos" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
            Ver todos →
          </Link>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Cliente', 'Estado', 'Total', 'Fecha'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 border-b border-[#282828]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-600">
                  No hay pedidos todavía
                </td>
              </tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/pedidos/${o.id}`} className="group">
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {o.customer?.contacto_nombre ?? '—'}
                      </div>
                      <div className="text-xs text-zinc-500">{o.customer?.company_name}</div>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[o.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-zinc-200">
                    {fmt(o.total_productos)}
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
