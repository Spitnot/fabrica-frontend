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
  created_at: string;
}

function PortalOrdersInner() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get('status') ?? '';
  const fromParam   = searchParams.get('from')   ?? '';
  const toParam     = searchParams.get('to')     ?? '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => orders.filter(o => {
    if (statusParam && o.status !== statusParam) return false;
    if (fromParam) { const f = new Date(fromParam); f.setHours(0,0,0,0); if (new Date(o.created_at) < f) return false; }
    if (toParam)   { const t = new Date(toParam); t.setHours(23,59,59,999); if (new Date(o.created_at) > t) return false; }
    return true;
  }), [orders, statusParam, fromParam, toParam]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    Object.keys(STATUS_LABELS).forEach(k => counts[k] = 0);
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return counts;
  }, [orders]);

  const hasFilters = statusParam || fromParam || toParam;

  const tabs = [
    { id: '',            label: 'All',       count: statusCounts.all ?? 0 },
    { id: 'draft',       label: 'Draft',     count: statusCounts.draft ?? 0 },
    { id: 'confirmado',  label: 'Confirmed', count: statusCounts.confirmado ?? 0 },
    { id: 'produccion',  label: 'In Prod',   count: statusCounts.produccion ?? 0 },
    { id: 'listo_envio', label: 'Ready',     count: statusCounts.listo_envio ?? 0 },
    { id: 'enviado',     label: 'Shipped',   count: statusCounts.enviado ?? 0 },
  ];

  const cols = '90px 140px 90px 130px 90px';

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
            MY ORDERS<span style={{ color: '#D93A35' }}>.</span>
          </div>
          {!loading && (
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.1em', marginTop: 6 }}>
              {filtered.length} {filtered.length !== orders.length ? `of ${orders.length} ` : ''}ORDER{orders.length !== 1 ? 'S' : ''}
            </div>
          )}
        </div>
        <Link href="/portal/pedidos/nuevo">
          <button className="btn-primary">+ NEW ORDER</button>
        </Link>
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
                background: 'transparent', color: '#111',
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontWeight: active ? 700 : 500, fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex', gap: 6, alignItems: 'baseline',
                marginBottom: -1, cursor: 'pointer',
              }}
            >
              {t.label}
              <span style={{ fontSize: 9, color: active ? '#111' : 'rgba(17,17,17,0.4)' }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>From</label>
          <input type="date" value={fromParam} onChange={e => setParam('from', e.target.value)} style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '6px 10px', background: '#fff', outline: 'none', width: 160 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>To</label>
          <input type="date" value={toParam} onChange={e => setParam('to', e.target.value)} style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '6px 10px', background: '#fff', outline: 'none', width: 160 }} />
        </div>
        {hasFilters && (
          <button onClick={() => router.replace(pathname, { scroll: false })} className="btn-ghost" style={{ alignSelf: 'flex-end' }}>
            Clear ×
          </button>
        )}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>
          LOADING…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>
          {hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map(o => {
            const dateStr = new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
            return (
              <Link
                key={o.id}
                href={`/portal/pedidos/${o.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: 16, alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid rgba(17,17,17,0.1)',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: '#D93A35', letterSpacing: '0.04em' }}>
                  #{o.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusChip status={o.status as FRStatus} size="sm" />
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.45)' }}>
                      {dateStr}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)' }}>
                    {o.peso_total} kg
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(o.total_productos)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PortalOrdersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#111', fontSize: 12 }}>Loading…</div>}>
      <PortalOrdersInner />
    </Suspense>
  );
}
