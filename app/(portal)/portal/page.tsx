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
    <div className="relative w-full h-[260px] md:h-[300px] overflow-hidden rounded-2xl mb-8 bg-gray-100">
      {/* Product image — full brightness */}
      {current && (
        <img
          key={slide}
          src={current.image}
          alt={current.name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 300ms ease' }}
        />
      )}

      {/* Product name badge — bottom left */}
      <div
        className="absolute bottom-4 left-4"
        style={{ opacity: fading ? 0 : 1, transition: 'opacity 300ms ease' }}
      >
        {current && (
          <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
            {current.name}
          </span>
        )}
      </div>

      {/* CTA button — bottom right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        {slides.length > 1 && slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === slide ? 18 : 6,
              height: 6,
              background: i === slide ? '#D93A35' : 'rgba(0,0,0,0.25)',
            }}
          />
        ))}
        <Link href="/portal/pedidos/nuevo"
          className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#D93A35] hover:bg-[#b52e2a] text-white text-xs font-bold rounded-lg transition-colors shadow">
          New Order
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroSlides, setHeroSlides] = useState<{ image: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); });

    // Pull product images + names for the hero slideshow
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
    <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
      Loading…
    </div>
  );

  return (
    <div className="p-5 md:p-7 max-w-3xl">
      {/* Hero banner */}
      <HeroBanner slides={heroSlides} />

      {/* Orders section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400"
            style={{ fontFamily: 'var(--font-alexandria)' }}>My Orders</h2>
        {orders.length > 0 && (
          <span className="text-[11px] text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400 mb-3">No orders yet.</p>
          <Link href="/portal/pedidos/nuevo"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D93A35] hover:underline">
            Place your first order →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
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
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[order.status] ?? STATUS_STYLES.draft}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-gray-400">
                      <span className="sm:hidden">{order.id.slice(0, 8)}…</span>
                      <span className="hidden sm:inline truncate">{order.id}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{date} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.peso_total} kg</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(total)}</div>
                    {shipping > 0 && (
                      <div className="text-[10px] text-gray-400">+{fmt(shipping)} ship.</div>
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
