/**
 * Drop-in replacement for app/(portal)/portal/page.tsx
 *
 * Hits the same /api/portal/orders + /api/products endpoints, same shapes.
 * Visual = storefront-faithful:
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │  ORDERS                                       N items │ ← page header
 *   │  Sort ▾  ─────────────────────────────────  [+ NEW]   │
 *   ├───────────────────────────────────────────────────────┤
 *   │  ░░░░░░░  #ABCD1234   3 items · 2.4 kg     €128,00  › │ ← row card
 *   │  CONFIRMED              26 Apr 2026                   │
 *   │  ───────────────────────────────────────────────────  │
 *   ├───────────────────────────────────────────────────────┤
 *   │  ░░░░░░░  #EFGH5678   …                               │
 *   └───────────────────────────────────────────────────────┘
 *
 * Color block on the LEFT of each row uses the storefront product palette,
 * picked deterministically from the order id so reorders look stable.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { StatusChip } from '../_components/StatusChip';

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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

/* Storefront product-block palette — the exact swatches in the screenshots */
const BLOCK_COLORS = ['#D93A35', '#F4D03F', '#E07B3A', '#5BA8C7', '#5BB85A', '#A8D5D5', '#B5B5B5'];

function blockFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(h) % BLOCK_COLORS.length];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'date' | 'total'>('date');

  useEffect(() => {
    fetch('/api/portal/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...orders];
    if (sort === 'date') arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else arr.sort((a, b) => b.total_productos - a.total_productos);
    return arr;
  }, [orders, sort]);

  return (
    <div className="orders-page">
      <div className="orders-page__inner">

        {/* Header — big block title on the left, item count + new button on the right */}
        <header className="orders-header">
          <h1 className="orders-title">ORDERS</h1>
          <div className="orders-header__right">
            <span className="orders-header__count">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
            <Link href="/portal/pedidos/nuevo" className="orders-header__cta">
              + NEW ORDER
            </Link>
          </div>
        </header>

        {/* Sort bar — mimics the "Disponibilidad / Precio" filter row on /products */}
        <div className="orders-toolbar">
          <button
            className={`orders-toolbar__sort ${sort === 'date' ? 'is-active' : ''}`}
            onClick={() => setSort('date')}
          >
            Date {sort === 'date' && '▾'}
          </button>
          <button
            className={`orders-toolbar__sort ${sort === 'total' ? 'is-active' : ''}`}
            onClick={() => setSort('total')}
          >
            Total {sort === 'total' && '▾'}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p className="orders-empty">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="orders-empty-state">
            <p>No orders yet.</p>
            <Link href="/portal/pedidos/nuevo" className="orders-empty-state__cta">
              Place your first order →
            </Link>
          </div>
        ) : (
          <ul className="orders-list">
            {sorted.map(order => {
              const itemCount = order.order_items?.[0]?.count ?? 0;
              const shipping = order.coste_envio_final ?? order.coste_envio_estimado ?? 0;
              const total = order.total_productos + shipping;
              const date = new Date(order.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              });
              return (
                <li key={order.id}>
                  <Link href={`/portal/pedidos/${order.id}`} className="order-row">
                    <span className="order-row__block" style={{ background: blockFor(order.id) }} aria-hidden />
                    <div className="order-row__left">
                      <div className="order-row__id">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="order-row__meta">
                        {date} · {itemCount} item{itemCount !== 1 ? 's' : ''} · {order.peso_total} kg
                      </div>
                      <div className="order-row__status"><StatusChip status={order.status} /></div>
                    </div>
                    <div className="order-row__right">
                      <div className="order-row__total">{fmt(total)}</div>
                      {shipping > 0 && (
                        <div className="order-row__ship">+{fmt(shipping)} ship.</div>
                      )}
                    </div>
                    <span className="order-row__chev" aria-hidden>›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <style jsx>{`
        .orders-page { padding: 32px 24px 64px; }
        .orders-page__inner { max-width: 1100px; margin: 0 auto; }

        .orders-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 14px; gap: 16px; flex-wrap: wrap;
        }
        .orders-title {
          font-family: var(--fr-display);
          font-size: 56px; font-weight: 900; line-height: 1;
          letter-spacing: -0.01em; margin: 0;
          color: #111;
        }
        @media (max-width: 768px) {
          .orders-title { font-size: 40px; }
        }
        .orders-header__right {
          display: flex; align-items: center; gap: 16px;
        }
        .orders-header__count {
          font-family: var(--fr-mono); font-size: 11px; color: #111;
        }
        .orders-header__cta {
          background: #111; color: #fff;
          padding: 10px 14px;
          font-family: var(--fr-display);
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          text-decoration: none;
          border: 1px solid #111;
        }
        .orders-header__cta:hover { background: #fff; color: #111; }

        .orders-toolbar {
          display: flex; gap: 18px;
          padding: 12px 0;
          border-top: 1px solid #111;
          border-bottom: 1px solid var(--fr-line-soft);
          margin-bottom: 24px;
        }
        .orders-toolbar__sort {
          background: transparent; border: 1px solid #111; cursor: pointer;
          font-family: var(--fr-mono); font-size: 12px; font-weight: 700;
          color: #111; padding: 6px 12px;
          box-shadow: 2px 2px 0 #111;
        }
        .orders-toolbar__sort.is-active { background: #111; color: #fff; }

        .orders-empty { font-family: var(--fr-mono); color: #111; padding: 40px 0; }
        .orders-empty-state {
          border: 1px solid #111;
          padding: 56px 24px;
          text-align: center;
          font-family: var(--fr-mono);
        }
        .orders-empty-state p { color: #111; margin: 0 0 12px; }
        .orders-empty-state__cta {
          font-family: var(--fr-display);
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          color: var(--fr-red); text-decoration: none;
        }

        .orders-list { list-style: none; padding: 0; margin: 0; }
        .orders-list li + li { margin-top: -1px; }

        .order-row {
          display: grid;
          grid-template-columns: 80px 1fr auto auto;
          gap: 16px; align-items: center;
          padding: 18px 18px 18px 0;
          border: 1px solid #111;
          background: #fff;
          text-decoration: none;
          color: #111;
        }
        .order-row:hover { background: #fafaf7; }

        .order-row__block { width: 80px; height: 80px; display: block; }

        .order-row__left { min-width: 0; }
        .order-row__id {
          font-family: var(--fr-mono);
          font-size: 14px; font-weight: 700;
          color: #111;
          margin-bottom: 4px;
        }
        .order-row__meta {
          font-family: var(--fr-mono);
          font-size: 11px; color: #111;
          margin-bottom: 8px;
        }
        .order-row__status { display: flex; }

        .order-row__right { text-align: right; }
        .order-row__total {
          font-family: var(--fr-display);
          font-size: 22px; font-weight: 900; line-height: 1;
          color: #111;
        }
        .order-row__ship {
          font-family: var(--fr-mono);
          font-size: 10px; color: #111;
          margin-top: 4px;
        }

        .order-row__chev {
          font-size: 24px; color: #111;
          padding: 0 4px;
        }

        @media (max-width: 640px) {
          .order-row { grid-template-columns: 60px 1fr auto; padding-right: 12px; }
          .order-row__block { width: 60px; height: 60px; }
          .order-row__chev { display: none; }
          .order-row__total { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}
