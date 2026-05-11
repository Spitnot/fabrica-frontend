'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { StatusChip, FRStatus } from '@/components/fr/StatusChip';

// ─── Hero slideshow (Shopify product images) ─────────────────────────────────

function HeroBanner({ slides }: { slides: { image: string; name: string }[] }) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slides.length || 1;

  function goTo(idx: number) {
    if (idx === slide) return;
    setFading(true);
    setTimeout(() => { setSlide(idx); setFading(false); }, 300);
  }

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % total); setFading(false); }, 300);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, total]);

  const current = slides[slide % total];

  return (
    <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', background: '#111' }}>
      {current && (
        <img
          key={slide}
          src={current.image}
          alt={current.name}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: fading ? 0 : 1,
            transition: 'opacity 300ms ease',
          }}
        />
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />

      {current && (
        <div style={{ position: 'absolute', bottom: 44, left: 16, opacity: fading ? 0 : 1, transition: 'opacity 300ms' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '3px 8px' }}>
            {current.name}
          </span>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {slides.length > 1 && slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === slide ? 20 : 6, height: 6,
                background: i === slide ? '#D93A35' : 'rgba(255,255,255,0.4)',
                border: 'none', boxShadow: 'none', padding: 0,
                transition: 'all 0.3s', cursor: 'pointer', minHeight: 'auto',
              }}
            />
          ))}
        </div>
        <Link href="/portal/pedidos/nuevo">
          <button className="btn-primary" style={{ fontSize: 9, padding: '7px 14px' }}>
            + New Order
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', esperando_pago: 'Awaiting Payment', enviado: 'Shipped', cancelado: 'Cancelled',
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
  const [heroSlides, setHeroSlides] = useState<{ image: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        const products: any[] = d.data ?? [];
        const seen = new Set<string>();
        const slides: { image: string; name: string }[] = [];
        for (const p of products) {
          if (p.imagen && !seen.has(p.nombre_producto)) {
            seen.add(p.nombre_producto);
            slides.push({ image: p.imagen, name: p.nombre_producto });
          }
          if (slides.length >= 6) break;
        }
        setHeroSlides(slides);
      })
      .catch(() => {});
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
    { id: 'listo_envio',    label: 'Ready',    count: statusCounts.listo_envio ?? 0 },
    { id: 'esperando_pago', label: 'Pay Now',  count: statusCounts.esperando_pago ?? 0 },
    { id: 'enviado',     label: 'Shipped',   count: statusCounts.enviado ?? 0 },
  ];

  const cols = '90px 140px 90px 130px 90px';

  return (
    <div className="fr-page" style={{ paddingTop: heroSlides.length > 0 ? 0 : undefined }}>

      {/* Hero — edge-to-edge */}
      {heroSlides.length > 0 && (
        <div style={{ margin: '0 -32px' }}>
          <HeroBanner slides={heroSlides} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: heroSlides.length > 0 ? 20 : 0 }}>
        <div>
          <div className="fr-label">{loading ? '—' : `${filtered.length} of ${orders.length} records`}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Orders</h1>
        </div>
        <Link href="/portal/pedidos/nuevo"><button className="btn-primary">+ New Order</button></Link>
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
                fontWeight: active ? 700 : 500, fontSize: 12, letterSpacing: '0.03em',
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

      {/* Date filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
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
          <div style={{ minWidth: 500 }}>
            <div className="fr-table-head" style={{ gridTemplateColumns: cols }}>
              {['ID', 'Status', 'Weight', 'Amount', 'Date'].map(h => (
                <div key={h} className="fr-label">{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#111' }}>
                {hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
              </div>
            ) : filtered.map(o => (
              <Link key={o.id} href={`/portal/pedidos/${o.id}`} className="fr-row" style={{ gridTemplateColumns: cols }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: '#D93A35' }}>
                  {o.id.slice(0, 8).toUpperCase()}
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
            ))}
          </div>
        </div>
      </div>
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
