'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

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

export default function PortalPage() {
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: cust } = await supabaseClient
        .from('customers')
        .select('id, contacto_nombre, company_name')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!cust) { setLoading(false); return; }
      setCustomer(cust);

      const { data: orders } = await supabaseClient
        .from('orders')
        .select('id, status, total_productos, coste_envio_estimado, coste_envio_final, tracking_url, created_at')
        .eq('customer_id', cust.id)
        .order('created_at', { ascending: false });

      setOrders(orders ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>
            My Orders
          </h1>
          {customer && (
            <p className="text-xs text-gray-400 mt-0.5">
              {customer.contacto_nombre} · {customer.company_name}
            </p>
          )}
        </div>
        <Link
          href="/portal/pedidos/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors"
        >
          + New Order
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                {['Order', 'Status', 'Products', 'Shipping', 'Total', 'Tracking', 'Date'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
                      Loading orders…
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/portal/pedidos/${o.id}`} className="font-mono text-xs text-[#D93A35] hover:text-[#b52e2a] transition-colors">
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[o.status]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{fmt(o.total_productos)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {o.coste_envio_final ? fmt(o.coste_envio_final) : o.coste_envio_estimado ? fmt(o.coste_envio_estimado) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                      {fmt(o.total_productos + (o.coste_envio_final ?? o.coste_envio_estimado ?? 0))}
                    </td>
                    <td className="px-5 py-3">
                      {o.tracking_url ? (
                        <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#0087B8] underline underline-offset-2">
                          Track →
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
