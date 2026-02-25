'use client';

import { useState, useEffect } from 'react';
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

export default function PortalPage() {
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      console.log('SESSION:', session?.user?.id, session?.user?.email);

      if (!session?.user) {
        console.log('No session found');
        setLoading(false);
        return;
      }

      const { data: cust } = await supabaseClient
        .from('customers')
        .select('id, contacto_nombre, company_name')
        .eq('auth_user_id', session.user.id)
        .single();

      console.log('CUSTOMER:', cust);

      if (!cust) { setLoading(false); return; }
      setCustomer(cust);

      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select('id, status, total_productos, coste_envio_estimado, coste_envio_final, tracking_url, created_at')
        .eq('customer_id', cust.id)
        .order('created_at', { ascending: false });

      console.log('ORDERS:', orders, 'ERROR:', error);
      setOrders(orders ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Mis Pedidos</h1>
        {customer && (
          <p className="text-xs text-zinc-500 mt-1">
            {customer.contacto_nombre} · {customer.company_name}
          </p>
        )}
      </div>

      <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Referencia', 'Estado', 'Productos', 'Envío', 'Total', 'Tracking', 'Fecha'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 border-b border-[#282828]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-600 text-sm">
                    <div className="w-4 h-4 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
                    Cargando pedidos…
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-600">
                  No tienes pedidos todavía
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/portal/pedidos/${o.id}`} className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors">
                      {o.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[o.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-300">{fmt(o.total_productos)}</td>
                  <td className="px-5 py-3 text-sm text-zinc-400">
                    {o.coste_envio_final ? fmt(o.coste_envio_final) : o.coste_envio_estimado ? fmt(o.coste_envio_estimado) : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-zinc-200">
                    {fmt(o.total_productos + (o.coste_envio_final ?? o.coste_envio_estimado ?? 0))}
                  </td>
                  <td className="px-5 py-3">
                    {o.tracking_url ? (
                      <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-sky-400 underline underline-offset-2">
                        Seguir →
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
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
