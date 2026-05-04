'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { StatusChip, FRStatus } from '@/components/fr/StatusChip';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
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
  const router   = useRouter();
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
      setOrders((await oRes.json()).data ?? []);
      setCustomers((await cRes.json()).data ?? []);
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
    if (toParam)   { const t = new Date(toParam); t.setHours(23,59,59,999); if (new Date(o.created_at) > t) return false; }
    return true;
  }), [orders, statusParam, customerParam, fromParam, toParam]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    Object.keys(STATUS_LABELS).forEach(k => counts[k] = 0);
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return counts;
  }, [orders]);

  const hasFilters = statusParam || customerParam || fromParam || toParam;

  const tabs = [
    { id: '',            label: 'All',       count: statusCounts.all ?? 0 },
    { id: 'draft',       label: 'Draft',     count: statusCounts.draft ?? 0 },
    { id: 'confirmado',  label: 'Confirmed', count: statusCounts.confirmado ?? 0 },
    { id: 'produccion',  label: 'In Prod',   count: statusCounts.produccion ?? 0 },
    { id: 'listo_envio', label: 'Ready',     count: statusCounts.listo_envio ?? 0 },
    { id: 'enviado',     label: 'Shipped',   count: statusCounts.enviado ?? 0 },
  ];

  const cols = '90px 1.4fr 140px 90px 130px 90px';

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="fr-label">{loading ? '—' : `${filtered.length} of ${orders.length} records`}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Orders</h1>
        </div>
        <Link href="/pedidos/nuevo"><button className="btn-primary">+ New Order</button></Link>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid #111', gap: 0 }}>
        {tabs.map(t => {
          const active = t.id === statusParam;
          return (
            <button
              key={t.id || 'all'}
              onClick={() => setParam('status', t.id)}
              style={{
                padding: '10px 16px', border: 'none', boxShadow: 'none',
                borderBottom: active ? '2px solid #111' : '2px solid transparent',
                background: 'transparent',
                color: '#111',
                fontWeight: active ? 700 : 500,
                fontSize: 12, letterSpacing: '0.03em',
                display: 'flex', gap: 6, alignItems: 'baseline',
                marginBottom: -1,
              }}
            >
              {t.label}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#111' }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="fr-label">Client</label>
          <select value={customerParam} onChange={e => setParam('customer', e.target.value)} style={{ maxWidth: 240, width: 240 }}>
            <option value="">All clients</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {`${c.first_name ?? c.contacto_nombre ?? ''} ${c.last_name ?? ''}`.trim()} · {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="fr-label">From</label>
          <input type="date" value={fromParam} onChange={e => setParam('from', e.target.value)} style={{ width: 160 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="fr-label">To</label>
          <input type="date" value={toParam} onChange={e => setParam('to', e.target.value)} style={{ width: 160 }} />
        </div>
        {hasFilters && (
          <button onClick={() => router.replace(pathname, { scroll: false })} className="btn-ghost">
            Clear ×
          </button>
        )}
      </div>

      {/* Table */}
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>
            <div className="fr-table-head" style={{ gridTemplateColumns: cols }}>
              {['ID', 'Client', 'Status', 'Weight', 'Amount', 'Date'].map(h => (
                <div key={h} className="fr-label">{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>
                {hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
              </div>
            ) : filtered.map((o, i) => {
              const first = o.customer?.first_name ?? o.customer?.contacto_nombre ?? '—';
              const last  = o.customer?.last_name ?? '';
              return (
                <Link key={o.id} href={`/pedidos/${o.id}`} className="fr-row" style={{ gridTemplateColumns: cols }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: '#D93A35' }}>
                    {o.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{`${first} ${last}`.trim()}</div>
                    <div className="fr-label" style={{ color: '#111' }}>{o.customer?.company_name}</div>
                  </div>
                  <StatusChip status={o.status as FRStatus} size="sm" />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {o.peso_total}<span style={{ fontSize: 9, color: '#111', marginLeft: 2 }}>kg</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(o.total_productos)}
                  </div>
                  <div className="fr-label" style={{ color: '#111' }}>
                    {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#111', fontSize: 12 }}>Loading…</div>}>
      <PedidosInner />
    </Suspense>
  );
}
