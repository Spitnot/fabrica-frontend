'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_productos: number;
  coste_envio_estimado: number | null;
  coste_envio_final: number | null;
  peso_total: number;
  order_items: { count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  draft:       'Draft',
  confirmado:  'Confirmed',
  produccion:  'In Production',
  listo_envio: 'Ready to Ship',
  enviado:     'Shipped',
  cancelado:   'Cancelled',
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
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
      Loading orders…
    </div>
  );

  return (
    <div className="p-6 md:p-7 max-w-3xl">
      <h1 className="text-lg font-black tracking-wider uppercase text-gray-900 mb-6"
          style={{ fontFamily: 'var(--font-alexandria)' }}>My Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const itemCount = order.order_items?.[0]?.count ?? 0;
            const shipping = order.coste_envio_final ?? order.coste_envio_estimado ?? 0;
            const total = order.total_productos + shipping;
            const date = new Date(order.created_at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            return (
              <Link key={order.id} href={`/portal/pedidos/${order.id}`}
                className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-[#D93A35]/40 hover:shadow-sm transition-all group">

                <div className="flex items-center gap-4 min-w-0">
                  {/* Status dot */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[order.status] ?? STATUS_STYLES.draft}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>

                  {/* ID + date */}
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-gray-400 truncate">{order.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{date} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.peso_total} kg</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(total)}</div>
                    {shipping > 0 && (
                      <div className="text-[10px] text-gray-400">+{fmt(shipping)} shipping</div>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#D93A35] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
