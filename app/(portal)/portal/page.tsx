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

const SLIDES = [
  { headline: 'New Season,\nNew Styles.', sub: 'Fresh drops available now — place your wholesale order today.' },
  { headline: 'Restock\nSmart.', sub: 'Your customers are waiting. Keep your shelves full.' },
  { headline: 'Exclusive\nWholesale Prices.', sub: 'Premium rollers at margins that move your business forward.' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

function HeroBanner({ images }: { images: string[] }) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = images.length || 1;

  function goTo(idx: number) {
    if (idx === slide) return;
    setFading(true);
    setTimeout(() => {
      setSlide(idx);
      setFading(false);
    }, 350);
  }

  useEffect(() => {
    if (images.length < 2) return;
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlide(s => (s + 1) % total);
        setFading(false);
      }, 350);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, total]);

  const textSlide = SLIDES[slide % SLIDES.length];

  return (
    <div className="relative w-full h-[260px] md:h-[300px] overflow-hidden rounded-2xl mb-8 bg-gray-900">
      {/* Background image */}
      {images.length > 0 && (
        <img
          key={slide}
          src={images[slide % images.length]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: fading ? 0 : 0.45,
            transition: 'opacity 350ms ease',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      {/* Content */}
      <div
        className="absolute inset-0 flex flex-col justify-center px-8 md:px-10"
        style={{ opacity: fading ? 0 : 1, transition: 'opacity 350ms ease' }}
      >
        <p className="text-[10px] font-black tracking-[0.25em] uppercase text-[#D93A35] mb-2"
           style={{ fontFamily: 'var(--font-alexandria)' }}>
          Firma Rollers · B2B
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3 whitespace-pre-line"
            style={{ fontFamily: 'var(--font-alexandria)' }}>
          {textSlide.headline}
        </h2>
        <p className="text-sm text-white/60 mb-5 max-w-xs leading-relaxed">
          {textSlide.sub}
        </p>
        <Link href="/portal/pedidos/nuevo"
          className="inline-flex items-center gap-2 self-start px-5 py-2.5 bg-[#D93A35] hover:bg-[#b52e2a] text-white text-sm font-bold rounded-xl transition-colors">
          Place an Order
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === slide ? 20 : 6,
                height: 6,
                background: i === slide ? '#D93A35' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); });

    // Pull a handful of product images for the hero
    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        const products: any[] = d.data ?? [];
        // Deduplicate by product name, keep first image per product
        const seen = new Set<string>();
        const imgs: string[] = [];
        for (const p of products) {
          if (p.imagen && !seen.has(p.nombre_producto)) {
            seen.add(p.nombre_producto);
            imgs.push(p.imagen);
          }
          if (imgs.length >= 6) break;
        }
        setHeroImages(imgs);
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
      <HeroBanner images={heroImages} />

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
                    <div className="font-mono text-[11px] text-gray-400 truncate">{order.id}</div>
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
