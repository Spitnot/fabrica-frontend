// app/(dashboard)/pedidos/page.tsx
// Client component — original data fetching, URL param sync, and filter state preserved.
// Body restructured to match Foundry/Marker mockup: page header + filter strip
// + dark-headed table with Alexandria amounts, mono ids, and StatusChip.

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, FR } from '@/components/fr/Atoms';
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

  // Counts per status for the filter tab strip
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    Object.keys(STATUS_LABELS).forEach(k => counts[k] = 0);
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return counts;
  }, [orders]);

  const hasFilters = statusParam || customerParam || fromParam || toParam;

  const inputSt: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 500,
    border: 'var(--border-dash)', borderRadius: 0, padding: '8px 12px',
    background: '#fff', color: '#111', outline: 'none',
  };

  const tabs: { id: string; label: string; count: number }[] = [
    { id: '',            label: 'ALL',       count: statusCounts.all ?? 0 },
    { id: 'draft',       label: 'DRAFT',     count: statusCounts.draft ?? 0 },
    { id: 'confirmado',  label: 'CONFIRMED', count: statusCounts.confirmado ?? 0 },
    { id: 'produccion',  label: 'IN PROD',   count: statusCounts.produccion ?? 0 },
    { id: 'listo_envio', label: 'READY',     count: statusCounts.listo_envio ?? 0 },
    { id: 'enviado',     label: 'SHIPPED',   count: statusCounts.enviado ?? 0 },
  ];

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        title="ORDERS"
        count={loading ? 'LOADING…' : `${filtered.length} OF ${orders.length} RECORDS`}
        actions={<Link href="/pedidos/nuevo"><button className="btn-primary">+ NEW ORDER</button></Link>}
      />

      {/* Status tab strip — connected to ?status= URL param */}
      <div style={{ display: 'flex', flexWrap: 'wrap', border: 'var(--border-dash)', background: '#fff' }}>
        {tabs.map((t, i) => {
          const active = t.id === statusParam;
          return (
            <button
              key={t.id || 'all'}
              onClick={() => setParam('status', t.id)}
              style={{
                padding: '12px 18px',
                borderLeft: i === 0 ? 'none' : 'var(--border-dash)',
                background: active ? '#111' : '#fff',
                color: active ? '#fff' : '#111',
                boxShadow: 'none', border: 'none',
                fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                fontWeight: 900, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'flex', gap: 8, alignItems: 'baseline',
              }}>
              {t.label}
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 500, fontSize: 11, color: active ? FR.yellow : '#888' }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888' }}>CLIENT</label>
          <select value={customerParam} onChange={e => setParam('customer', e.target.value)} style={{ ...inputSt, maxWidth: 240 }}>
            <option value="">All clients</option>
            {customers.map(c => <option key={c.id} value={c.id}>{`${c.first_name ?? c.contacto_nombre ?? ""} ${c.last_name ?? ""}`.trim()} · {c.company_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888' }}>FROM</label>
          <input type="date" value={fromParam} onChange={e => setParam('from', e.target.value)} style={inputSt} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888' }}>TO</label>
          <input type="date" value={toParam} onChange={e => setParam('to', e.target.value)} style={inputSt} />
        </div>
        {hasFilters && (
          <button
            onClick={() => router.replace(pathname, { scroll: false })}
            style={{ background: 'transparent', border: 'var(--border-dash)', boxShadow: 'none', color: '#111', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', padding: '8px 14px', textTransform: 'uppercase' }}
          >
            CLEAR ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ border: 'var(--border-dash)', background: '#fff', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '110px 1.4fr 140px 100px 130px 90px',
              padding: '12px 18px', background: '#111', color: '#fff', gap: 12, alignItems: 'center',
            }}>
              {['ID', 'CLIENT', 'STATUS', 'WEIGHT', 'AMOUNT', 'DATE'].map(h => (
                <div key={h} style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em' }}>{h}</div>
              ))}
            </div>
            {/* Body */}
            {loading ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>
                {hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
              </div>
            ) : filtered.map((o, i) => {
              const first = (o.customer as any)?.first_name ?? o.customer?.contacto_nombre ?? '—';
              const last = (o.customer as any)?.last_name ?? '';
              const shortId = o.id.slice(0, 8).toUpperCase();
              return (
                <Link
                  key={o.id}
                  href={`/pedidos/${o.id}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '110px 1.4fr 140px 100px 130px 90px',
                    padding: '14px 18px', gap: 12, alignItems: 'center',
                    borderBottom: i < filtered.length - 1 ? 'var(--border-light)' : 'none',
                    color: '#111', textDecoration: 'none',
                  }}
                >
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 11, color: FR.red, letterSpacing: '0.06em' }}>
                    {shortId}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{`${first} ${last}`.trim()}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>{o.customer?.company_name}</div>
                  </div>
                  <StatusChip status={o.status as FRStatus} size="sm" />
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12 }}>
                    {o.peso_total}<span style={{ fontSize: 9, color: '#888', marginLeft: 2 }}>kg</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(o.total_productos)}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>
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
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontSize: 12 }}>Loading…</div>}>
      <PedidosInner />
    </Suspense>
  );
}
