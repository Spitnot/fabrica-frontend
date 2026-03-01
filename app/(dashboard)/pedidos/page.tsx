'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

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

interface Customer { id: string; contacto_nombre: string; company_name: string; }
interface Order {
  id: string; status: string; peso_total: number; total_produtos: number;
  created_at: string; customer?: { contacto_nombre: string; company_name: string; };
  customer_id: string;
}

export default function PedidosPage() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const statusParam   = searchParams.get('status')   ?? '';
  const customerParam = searchParams.get('customer') ?? '';
  const fromParam     = searchParams.get('from')     ?? '';
  const toParam       = searchParams.get('to')       ?? '';

  const [orders,    setOrders]    = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ordersRes, customersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/customers'),
      ]);
      const ordersData    = await ordersRes.json();
      const customersData = await customersRes.json();
      setOrders(ordersData.data    ?? []);
      setCustomers(customersData.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusParam   && o.status !== statusParam) return false;
      if (customerParam && o.customer_id !== customerParam) return false;
      if (fromParam) {
        const from = new Date(fromParam); from.setHours(0, 0, 0, 0);
        if (new Date(o.created_at) < from) return false;
      }
      if (toParam) {
        const to = new Date(toParam); to.setHours(23, 59, 59, 999);
        if (new Date(o.created_at) > to) return false;
      }
      return true;
    });
  }, [orders, statusParam, customerParam, fromParam, toParam]);

  const hasFilters = statusParam || customerParam || fromParam || toParam;
  const inputCls = "bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} of ${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/pedidos/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
          + New Order
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Status</label>
          <select value={statusParam} onChange={e => setParam('status', e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Client</label>
          <select value={customerParam} onChange={e => setParam('customer', e.target.value)} className={`${inputCls} max-w-[200px]`}>
            <option value="">All clients</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.contacto_nombre} · {c.company_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">From</label>
          <input type="date" value={fromParam} onChange={e => setParam('from', e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">To</label>
          <input type="date" value={toParam} onChange={e => setParam('to', e.target.value)} className={inputCls} />
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="py-1.5 px-3 text-xs font-semibold text-gray-400 hover:text-[#D93A35] transition-colors self-end">
            Clear ×
          </button>
        )}
      </div>

      {/* Table */}
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    {hasFilters ? 'No orders match the current filters.' : 'No orders yet'}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
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
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(o.total_produtos)}</td>
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
