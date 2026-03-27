'use client';

import { useState, useEffect, useRef } from 'react';
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
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#876693', confirmado: '#0087B8', produccion: '#E6883E',
  listo_envio: '#0DA265', enviado: '#111', cancelado: '#999',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Hero slideshow ──────────────────────────────────────────────────────────
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
    <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', background: '#111', marginBottom: 20 }}>
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

      {/* Overlay oscuro bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />

      {/* Product name */}
      {current && (
        <div style={{ position: 'absolute', bottom: 44, left: 16, opacity: fading ? 0 : 1, transition: 'opacity 300ms' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '3px 8px' }}>
            {current.name}
          </span>
        </div>
      )}

      {/* Dots + CTA */}
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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [heroSlides, setHeroSlides] = useState<{ image: string; name: string }[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); });

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
      });
  }, []);

  if (loading) return (
    <div style={{ padding: 24, fontSize: 12, color: '#aaa' }}>Loading…</div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* Hero */}
      <HeroBanner slides={heroSlides} />

      <div style={{ padding: '0 16px 32px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa' }}>
            My Orders
          </div>
          {orders.length > 0 && (
            <span style={{ fontSize: 10, color: '#bbb' }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <div style={{ border: '1px dashed #ddd', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>No orders yet.</div>
            <Link href="/portal/pedidos/nuevo" style={{ fontSize: 11, fontWeight: 700, color: '#D93A35', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Place your first order →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {orders.map(order => {
              const itemCount = order.order_items?.[0]?.count ?? 0;
              const shipping = order.coste_envio_final ?? order.coste_envio_estimado ?? 0;
              const total = order.total_productos + shipping;
              const statusColor = STATUS_COLORS[order.status] ?? '#999';
              const date = new Date(order.created_at).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric',
              });

              return (
                <Link
                  key={order.id}
                  href={`/portal/pedidos/${order.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      borderLeft: `3px solid ${statusColor}`,
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    {/* Status badge */}
                    <div style={{ flexShrink: 0 }}>
                      <span className="badge" style={{ background: statusColor }}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>
                        {date} · {itemCount} item{itemCount !== 1 ? 's' : ''} · {order.peso_total} kg
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#111', lineHeight: 1 }}>{fmt(total)}</div>
                      {shipping > 0 && (
                        <div style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>+{fmt(shipping)} ship.</div>
                      )}
                    </div>

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                      <path d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
