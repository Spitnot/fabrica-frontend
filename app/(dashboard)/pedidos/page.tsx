'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  draft:       '#876693',
  confirmado:  '#0087B8',
  produccion:  '#E6883E',
  listo_envio: '#0DA265',
  enviado:     '#111111',
  cancelado:   '#999999',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

interface Order {
  id: string; status: string; peso_total: number; total_productos: number;
  created_at: string; customer?: { contacto_nombre?: string; first_name?: string; last_name?: string; company_name: string; };
  customer_id: string;
}

interface Customer { id: string; contacto_nombre?: string; first_name?: string; last_name?: string; company_name: string; }

function PedidosInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusParam   = searchParams.get('status') ?? '';
  const customerParam = searchParams.get('customer') ?? '';
  const fromParam     = searchParams.get('from') ?? '';
  const toParam       = searchParams.get('to') ?? '';

  const [orders, setOrders]       = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [oRes, cRes] = await Promise.all([fetch('/api/orders'), fetch('/api/customers')]);
      const oData = await oRes.json();
      const cData = await cRes.json();
      setOrders(oData.data ?? []);
      setCustomers(cData.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => orders.filter(o => {
    if (statusParam && o.status !== statusParam) return false;
    if (customerParam && o.customer_id !== customerParam) return false;
    if (fromParam) { const f = new Date(fromParam); f.setHours(0,0,0,0); if (new Date(o.created_at) < f) return false; }
    if (toParam)   { const t = new Date(toParam);   t.setHours(23,59,59,999); if (new Date(o.created_at) > t) return false; }
    return true;
  }), [orders, statusParam, customerParam, fromParam, toParam]);

  const hasFilters = statusParam || customerParam || fromParam || toParam;

  const inputSt: React.CSSProperties = {
    fontFamily: 'var(--font-main)', fontSize: 11, fontWeight: 400,
    border: 'var(--border)', borderRadius: 0, padding: '6px 10px',
    background: '#fff', color: '#111', outline: 'none', width: 'auto',
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: 'var(--border)' }}>
        <div>
          <div className="page-title">Orders</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3, letterSpacing: '0.04em' }}>
            {loading ? 'Loading…' : `${filtered.length} of ${orders.length} orders`}
          </div>
        </div>
        <Link href="/pedidos/nuevo">
          <button className="btn-primary">+ New Order</button>
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Status</label>
          <select value={statusParam} onChange={e => setParam('status', e.target.value)} style={inputSt}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Client</label>
          <select value={customerParam} onChange={e => setParam('customer', e.target.value)} style={{ ...inputSt, maxWidth: 200 }}>
            <option value="">All clients</option>
            {customers.map(c => <option key={c.id} value={c.id}>{`${c.first_name ?? c.contacto_nombre ?? ""} ${c.last_name ?? ""}`.trim()} · {c.company_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>From</label>
          <input type="date" value={fromParam} onChange={e => setParam('from', e.target.value)} style={inputSt} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>To</label>
          <input type="date" value={toParam} onChange={e => setParam('to', e.target.value)} style={inputSt} />
        </div>
        {hasFilters && (
          <button
            onClick={() => router.replace(pathname, { scroll: false })}
            style={{ background: 'transparent', border: '1px solid #ddd', boxShadow: 'none', color: '#999', fontSize: 10, padding: '6px 10px' }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Client', 'Status', 'Weight', 'Amount', 'Date'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>
                    {hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
                  </td>
                </tr>
              ) : filtered.map((o, i) => (
                <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <td style={{ padding: '9px 14px' }}>
                    <Link href={`/pedidos/${o.id}`}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                        {`${(o.customer as any)?.first_name ?? o.customer?.contacto_nombre ?? "—"} ${(o.customer as any)?.last_name ?? ""}`.trim()}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>{o.customer?.company_name}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span className="badge" style={{ background: STATUS_COLORS[o.status] ?? '#999' }}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>
                    {o.peso_total} kg
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 900, color: '#111' }}>
                    {fmt(o.total_productos)}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#aaa', fontSize: 12 }}>Loading…</div>}>
      <PedidosInner />
    </Suspense>
  );
}
