/**
 * Drop-in replacement for app/(portal)/portal/pedidos/nuevo/page.tsx
 *
 * Same data flow (supabase load, /api/quotes, /api/orders POST) — visuals
 * lifted from the public storefront's PRODUCTS grid + product detail page.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  PRODUCTS                       8 items   Sort ▾    │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ░░░░  ░░░░  ░░░░  ░░░░     ← color-block product cards
 *   │ BASICS BASICS BASICS …
 *   │  ●●●●  ●●●●  ●●●●          ← variant color dots, click to add
 *   ├─────────────────────────────────────────────────────┤
 *   │  Sticky cart on the right ▶                         │
 *   └─────────────────────────────────────────────────────┘
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { getColorHex, parseVariant } from '@/lib/colors';
import { ColorDot } from '../../_components/StatusChip';

interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; peso_kg: number; imagen?: string; }
interface ProductGroup { nombre: string; variantes: Product[]; imagen?: string; }
interface TarifaPrecioPortal { sku: string; pack_size?: number | null; }
interface Tarifa { pack_size: number; minimum_order_value: number; hidden_products: string[]; precios?: TarifaPrecioPortal[]; }
interface Customer {
  id: string;
  contacto_nombre?: string;
  first_name?: string;
  last_name?: string;
  company_name: string;
  tarifa?: Tarifa | null;
  ship_street1?: string; ship_city?: string; ship_postal_code?: string; ship_country?: string;
  direccion_envio?: { street: string; city: string; postal_code: string; country: string; };
}
interface LineItem { sku: string; nombre_producto: string; variante?: string; cantidad: number; precio_unitario: number; peso_unitario: number; }
interface Quote { service_id: string; carrier: string; service_name: string; price: number; estimated_days: number; }

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

/* Storefront block palette — assigned by product name so cards stay stable */
const BLOCK_COLORS = ['#D93A35', '#F4D03F', '#E07B3A', '#5BA8C7', '#5BB85A', '#A8D5D5', '#B5B5B5'];
function blockFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(h) % BLOCK_COLORS.length];
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customer, setCustomer]               = useState<Customer | null>(null);
  const [products, setProducts]               = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch]                   = useState('');
  const [lineItems, setLineItems]             = useState<LineItem[]>([]);
  const [quotes, setQuotes]                   = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote]     = useState<Quote | null>(null);
  const [quotesLoading, setQuotesLoading]     = useState(false);
  const [confirming, setConfirming]           = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const { data: cust } = await supabaseClient
        .from('customers')
        .select('id, contacto_nombre, first_name, last_name, company_name, ship_street1, ship_city, ship_postal_code, ship_country, direccion_envio, tarifa:tarifa_id(pack_size, minimum_order_value, hidden_products, precios:tarifas_precios(sku, pack_size))')
        .eq('auth_user_id', user.id)
        .single();
      if (cust) setCustomer(cust as unknown as Customer);
    }
    loadData();
    fetch('/api/products').then(r => r.json()).then(d => { setProducts(d.data ?? []); setLoadingProducts(false); });
  }, []);

  const hiddenProducts: string[] = customer?.tarifa?.hidden_products ?? [];
  const minimumOrderValue: number = customer?.tarifa?.minimum_order_value ?? 0;

  const productGroups = useMemo<ProductGroup[]>(() => {
    const visible = products.filter(p => !hiddenProducts.includes(p.nombre_producto));
    const filtered = search.length >= 2
      ? visible.filter(p =>
          p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.variante ?? '').toLowerCase().includes(search.toLowerCase()))
      : visible;
    const map = new Map<string, Product[]>();
    filtered.forEach(p => { const g = map.get(p.nombre_producto) ?? []; g.push(p); map.set(p.nombre_producto, g); });
    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes, imagen: variantes[0]?.imagen }));
  }, [products, search, hiddenProducts]);

  const subtotal = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const total = subtotal + (selectedQuote?.price ?? 0);

  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue;
  const canConfirm = !!customer && lineItems.length > 0 && !belowMinimum;

  function getQty(sku: string) { return lineItems.find(i => i.sku === sku)?.cantidad ?? 0; }
  function getPackStep(sku: string): number {
    const skuPs = customer?.tarifa?.precios?.find(pr => pr.sku === sku)?.pack_size;
    if (skuPs != null && skuPs > 0) return skuPs;
    return customer?.tarifa?.pack_size ?? 1;
  }

  function addProduct(p: Product) {
    const step = getPackStep(p.sku);
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (ex) return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad + step } : i);
      return [...prev, { sku: p.sku, nombre_producto: p.nombre_producto, variante: p.variante, cantidad: step, precio_unitario: p.precio_mayorista, peso_unitario: p.peso_kg }];
    });
    setSelectedQuote(null); setQuotes([]);
  }
  function removeProduct(p: Product) {
    const step = getPackStep(p.sku);
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (!ex) return prev;
      if (ex.cantidad <= step) return prev.filter(i => i.sku !== p.sku);
      return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad - step } : i);
    });
    setSelectedQuote(null); setQuotes([]);
  }

  async function requestQuotes() {
    if (!lineItems.length || !customer) return;
    setQuotesLoading(true); setQuotes([]); setSelectedQuote(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: totalWeight, ancho: 30, alto: 20, largo: 30,
          destination: customer.ship_street1
            ? { street: customer.ship_street1, city: customer.ship_city, postal_code: customer.ship_postal_code, country: customer.ship_country }
            : customer.direccion_envio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error quoting');
      setQuotes(data.data ?? []);
    } catch (err: any) { setError(err.message); }
    finally { setQuotesLoading(false); }
  }

  async function handleConfirm() {
    if (!canConfirm || !customer) return;
    setConfirming(true); setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          items: lineItems.map(i => ({
            sku: i.sku,
            nombre_producto: i.nombre_producto + (i.variante ? ` - ${i.variante}` : ''),
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            peso_unitario: i.peso_unitario,
          })),
          coste_envio_estimado: selectedQuote?.price ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating order');
      router.push('/portal');
    } catch (err: any) { setError(err.message); setConfirming(false); }
  }

  const itemCount = lineItems.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="cat-page">
      <div className="cat-page__inner">

        <header className="cat-header">
          <h1 className="cat-title">PRODUCTS</h1>
          <div className="cat-header__right">
            <span className="cat-header__count">
              {productGroups.length} item{productGroups.length !== 1 ? 's' : ''}
            </span>
          </div>
        </header>

        {/* Filter bar — exact rhythm of the storefront's filter row */}
        <div className="cat-filterbar">
          <input
            className="cat-search"
            placeholder="Search by name, SKU or variant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {minimumOrderValue > 0 && (
            <span className={`cat-min ${belowMinimum && lineItems.length > 0 ? 'is-warn' : ''}`}>
              MIN. ORDER {fmt(minimumOrderValue)}
            </span>
          )}
        </div>

        <div className="cat-layout">
          {/* ── Product grid ─────────────────────────────────── */}
          <div className="cat-grid-wrap">
            {loadingProducts ? (
              <p className="cat-loading">Loading catalogue…</p>
            ) : (
              <div className="cat-grid">
                {productGroups.map(group => {
                  const first = group.variantes[0];
                  const block = blockFor(group.nombre);
                  return (
                    <article key={group.nombre} className="prod-card">
                      <div className="prod-card__block" style={{ background: block }}>
                        {group.imagen
                          ? <img src={group.imagen} alt={group.nombre} className="prod-card__img" />
                          : <span className="prod-card__placeholder">{group.nombre.split(' ')[0]}</span>
                        }
                      </div>
                      <div className="prod-card__body">
                        <h3 className="prod-card__name">{group.nombre.toUpperCase()}</h3>
                        <div className="prod-card__price">{fmt(first.precio_mayorista)}</div>

                        <div className="prod-card__variants">
                          {group.variantes.map(v => {
                            const qty = getQty(v.sku);
                            const { color } = parseVariant(v.variante);
                            const colorHex = color ? getColorHex(color) : null;
                            return (
                              <button
                                key={v.sku}
                                className={`var-btn ${qty > 0 ? 'is-active' : ''}`}
                                onClick={() => addProduct(v)}
                                title={`${v.variante ?? v.sku} — click to add`}
                              >
                                {colorHex ? (
                                  <ColorDot hex={colorHex} size={20} active={qty > 0} />
                                ) : (
                                  <span className="var-btn__sku">{v.variante ?? v.sku.slice(-3)}</span>
                                )}
                                {qty > 0 && <span className="var-btn__qty">{qty}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick decrement strip — only shows when something's in cart from this group */}
                        {group.variantes.some(v => getQty(v.sku) > 0) && (
                          <div className="prod-card__lines">
                            {group.variantes.filter(v => getQty(v.sku) > 0).map(v => (
                              <div key={v.sku} className="prod-card__line">
                                <span className="prod-card__line-name">{v.variante ?? v.sku}</span>
                                <div className="prod-card__line-ctrl">
                                  <button onClick={() => removeProduct(v)} aria-label="Remove one">−</button>
                                  <span>{getQty(v.sku)}</span>
                                  <button onClick={() => addProduct(v)} aria-label="Add one">+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Sticky cart panel ────────────────────────────── */}
          <aside className="cart">
            <div className="cart__head">
              <span>YOUR ORDER</span>
              <span className="cart__count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>

            {customer && (
              <div className="cart__client">
                <div className="cart__client-name">{customer.company_name}</div>
                <div className="cart__client-addr">
                  {(customer.ship_street1 ?? customer.direccion_envio?.street)} ·{' '}
                  {(customer.ship_postal_code ?? customer.direccion_envio?.postal_code)}{' '}
                  {(customer.ship_city ?? customer.direccion_envio?.city)}
                </div>
              </div>
            )}

            <div className="cart__lines">
              {lineItems.length === 0 ? (
                <p className="cart__empty">No products yet. Tap a color to add.</p>
              ) : (
                lineItems.map(item => (
                  <div key={item.sku} className="cart__line">
                    <div className="cart__line-name">
                      {item.nombre_producto}
                      {item.variante && <span className="cart__line-var"> · {item.variante}</span>}
                    </div>
                    <div className="cart__line-qty">{item.cantidad} × {fmt(item.precio_unitario)}</div>
                  </div>
                ))
              )}
            </div>

            <dl className="cart__totals">
              <div><dt>Weight</dt><dd>{totalWeight.toFixed(2)} kg</dd></div>
              <div><dt>Subtotal</dt><dd>{fmt(subtotal)}</dd></div>
              <div><dt>Shipping</dt><dd>{selectedQuote ? fmt(selectedQuote.price) : '—'}</dd></div>
              <div className="cart__totals-grand"><dt>Total</dt><dd>{fmt(total)}</dd></div>
            </dl>

            {belowMinimum && lineItems.length > 0 && (
              <div className="cart__warn">
                Minimum order is {fmt(minimumOrderValue)}. Add {fmt(minimumOrderValue - subtotal)} more.
              </div>
            )}

            {/* Shipping quotes */}
            <div className="cart__shipping">
              <div className="cart__shipping-head">
                <span>SHIPPING · PACKLINK</span>
                <button
                  className="cart__quote"
                  onClick={requestQuotes}
                  disabled={!lineItems.length || !customer || quotesLoading}
                >
                  {quotesLoading ? 'Querying…' : 'Get quotes'}
                </button>
              </div>
              {quotes.map(q => (
                <button
                  key={q.service_id}
                  onClick={() => setSelectedQuote(q)}
                  className={`cart__quote-row ${selectedQuote?.service_id === q.service_id ? 'is-selected' : ''}`}
                >
                  <div>
                    <div className="cart__quote-carrier">{q.carrier}</div>
                    <div className="cart__quote-service">{q.service_name} · {q.estimated_days}d</div>
                  </div>
                  <div className="cart__quote-price">{fmt(q.price)}</div>
                </button>
              ))}
            </div>

            {error && <div className="cart__error">{error}</div>}

            <button
              className="cart__confirm"
              disabled={!canConfirm || confirming}
              onClick={handleConfirm}
            >
              {confirming ? 'CREATING ORDER…' : 'CONFIRM ORDER'}
            </button>
            <p className="cart__note">Prices and weights are locked on confirmation</p>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="mob-bar">
        <div className="mob-bar__left">
          <span className="mob-bar__total">{fmt(total)}</span>
          <span className="mob-bar__items">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <button
          className="mob-bar__cta"
          disabled={!canConfirm || confirming}
          onClick={handleConfirm}
        >
          {confirming ? '…' : 'CONFIRM'}
        </button>
      </div>

      <style jsx>{`
        .cat-page { padding: 32px 24px 120px; }
        @media (min-width: 1024px) { .cat-page { padding-bottom: 64px; } }
        .cat-page__inner { max-width: 1300px; margin: 0 auto; }

        .cat-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 14px; gap: 16px; flex-wrap: wrap;
        }
        .cat-title {
          font-family: var(--fr-display);
          font-size: 56px; font-weight: 900; line-height: 1; letter-spacing: -0.01em;
          margin: 0; color: #111;
        }
        @media (max-width: 768px) { .cat-title { font-size: 40px; } }
        .cat-header__count {
          font-family: var(--fr-mono); font-size: 11px; color: #888;
        }

        .cat-filterbar {
          display: flex; align-items: center; gap: 16px;
          padding: 12px 0;
          border-top: 1px solid #111;
          border-bottom: 1px solid var(--fr-line-soft);
          margin-bottom: 24px;
        }
        .cat-search {
          flex: 1;
          background: transparent;
          border: 0; outline: 0;
          font-family: var(--fr-mono); font-size: 13px;
          color: #111;
        }
        .cat-search::placeholder { color: #aaa; }
        .cat-min {
          font-family: var(--fr-mono); font-size: 11px;
          letter-spacing: 0.1em; color: #888; flex-shrink: 0;
        }
        .cat-min.is-warn { color: var(--fr-red); font-weight: 700; }

        .cat-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 1023px) {
          .cat-layout { grid-template-columns: 1fr; }
        }

        .cat-loading { font-family: var(--fr-mono); color: #888; padding: 60px 0; text-align: center; }

        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        .prod-card {
          display: flex; flex-direction: column;
        }
        .prod-card__block {
          aspect-ratio: 1 / 1;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .prod-card__img {
          width: 100%; height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
        }
        .prod-card__placeholder {
          font-family: var(--fr-display);
          font-size: 32px; font-weight: 900; color: rgba(255,255,255,0.85);
          letter-spacing: 0.02em;
        }

        .prod-card__body { padding: 12px 0 0; }
        .prod-card__name {
          font-family: var(--fr-display);
          font-size: 17px; font-weight: 900;
          margin: 0 0 4px;
          line-height: 1.1;
          letter-spacing: 0;
        }
        .prod-card__price {
          font-family: var(--fr-mono);
          font-size: 12px; color: #111;
          margin-bottom: 10px;
        }

        .prod-card__variants {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 10px;
        }
        .var-btn {
          background: transparent; border: 0; padding: 0;
          cursor: pointer; position: relative;
          display: inline-flex; align-items: center;
        }
        .var-btn:hover { transform: translateY(-1px); }
        .var-btn__sku {
          font-family: var(--fr-mono);
          font-size: 9px; padding: 4px 6px;
          border: 1px solid #111;
          color: #111;
        }
        .var-btn.is-active .var-btn__sku { background: #111; color: #fff; }
        .var-btn__qty {
          position: absolute;
          top: -8px; right: -8px;
          background: var(--fr-red); color: #fff;
          font-family: var(--fr-mono);
          font-size: 9px; font-weight: 700;
          padding: 1px 4px; min-width: 14px; text-align: center;
        }

        .prod-card__lines {
          border-top: 1px solid var(--fr-line-soft);
          padding-top: 8px; margin-top: 4px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .prod-card__line {
          display: flex; align-items: center; justify-content: space-between;
          font-family: var(--fr-mono); font-size: 10px; color: #555;
        }
        .prod-card__line-name { letter-spacing: 0.04em; }
        .prod-card__line-ctrl {
          display: inline-flex; align-items: center; gap: 6px;
        }
        .prod-card__line-ctrl button {
          background: #fff; border: 1px solid #111;
          width: 22px; height: 22px; cursor: pointer;
          font-family: var(--fr-mono); font-size: 13px; color: #111;
          padding: 0; line-height: 1;
        }
        .prod-card__line-ctrl button:hover { background: #111; color: #fff; }
        .prod-card__line-ctrl span {
          min-width: 16px; text-align: center;
          font-weight: 700; color: #111;
        }

        /* Cart */
        .cart {
          position: sticky; top: 24px;
          border: 1px solid #111;
          background: #fff;
          padding: 16px;
          font-family: var(--fr-mono);
        }
        @media (max-width: 1023px) {
          .cart { position: static; }
        }
        .cart__head {
          display: flex; align-items: baseline; justify-content: space-between;
          font-family: var(--fr-display);
          font-size: 14px; font-weight: 900; letter-spacing: 0.06em;
          padding-bottom: 12px; border-bottom: 1px solid #111;
          margin-bottom: 14px;
        }
        .cart__count {
          font-family: var(--fr-mono); font-size: 11px;
          color: #888; font-weight: 400; letter-spacing: 0;
        }
        .cart__client {
          padding: 10px 12px;
          background: #f7f6f1;
          margin-bottom: 14px;
        }
        .cart__client-name { font-size: 12px; font-weight: 700; color: #111; }
        .cart__client-addr { font-size: 11px; color: #888; margin-top: 2px; }

        .cart__lines {
          font-size: 12px; color: #555;
          margin-bottom: 14px;
        }
        .cart__empty { color: #aaa; font-style: italic; margin: 0; }
        .cart__line {
          display: flex; justify-content: space-between; gap: 8px;
          padding: 6px 0;
          border-bottom: 1px dashed var(--fr-line-soft);
        }
        .cart__line:last-child { border-bottom: 0; }
        .cart__line-name { color: #111; flex: 1; }
        .cart__line-var { color: #888; }
        .cart__line-qty { color: #888; flex-shrink: 0; }

        .cart__totals {
          margin: 0 0 14px; padding: 12px 0;
          border-top: 1px solid #111;
          font-size: 12px;
        }
        .cart__totals div {
          display: flex; justify-content: space-between;
          padding: 3px 0;
        }
        .cart__totals dt { color: #888; }
        .cart__totals dd { color: #111; margin: 0; font-weight: 700; }
        .cart__totals-grand {
          padding-top: 8px !important;
          margin-top: 6px;
          border-top: 1px solid var(--fr-line-soft);
        }
        .cart__totals-grand dt {
          font-family: var(--fr-display) !important;
          font-weight: 900 !important;
          font-size: 14px !important;
          color: #111 !important;
        }
        .cart__totals-grand dd {
          font-family: var(--fr-display) !important;
          font-weight: 900 !important;
          font-size: 18px !important;
        }

        .cart__warn {
          background: #fff7e6;
          border: 1px solid #f3c87b;
          padding: 10px;
          font-size: 11px;
          color: #8a5b00;
          margin-bottom: 12px;
        }

        .cart__shipping { margin-bottom: 14px; }
        .cart__shipping-head {
          display: flex; align-items: center; justify-content: space-between;
          font-family: var(--fr-display);
          font-size: 11px; font-weight: 900; letter-spacing: 0.08em;
          padding: 8px 0; border-top: 1px solid var(--fr-line-soft);
          margin-bottom: 8px;
        }
        .cart__quote {
          background: transparent; border: 1px solid #111;
          padding: 4px 8px;
          font-family: var(--fr-mono); font-size: 10px; color: #111;
          cursor: pointer; letter-spacing: 0;
          text-transform: none;
        }
        .cart__quote:hover { background: #111; color: #fff; }
        .cart__quote:disabled { opacity: 0.4; cursor: not-allowed; }
        .cart__quote-row {
          width: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px;
          background: #fff; border: 1px solid var(--fr-line-soft);
          margin-bottom: 4px;
          font-family: var(--fr-mono); font-size: 11px;
          cursor: pointer; text-align: left;
        }
        .cart__quote-row.is-selected {
          border-color: #111; background: #f7f6f1;
        }
        .cart__quote-carrier { color: #111; font-weight: 700; }
        .cart__quote-service { color: #888; }
        .cart__quote-price { color: #111; font-weight: 700; }

        .cart__error {
          background: #fff0ef;
          border: 1px solid var(--fr-red);
          padding: 8px 10px;
          font-size: 11px; color: var(--fr-red);
          margin-bottom: 10px;
        }

        .cart__confirm {
          width: 100%;
          background: var(--fr-red);
          color: #fff;
          border: 0;
          padding: 14px;
          font-family: var(--fr-display);
          font-size: 13px; font-weight: 900; letter-spacing: 0.1em;
          cursor: pointer;
        }
        .cart__confirm:hover { background: #b52e2a; }
        .cart__confirm:disabled { background: #ccc; cursor: not-allowed; }

        .cart__note {
          margin: 8px 0 0;
          font-size: 10px;
          color: #aaa;
          text-align: center;
        }

        /* Mobile sticky bar */
        .mob-bar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-top: 1px solid #111;
          padding: 10px 16px;
          align-items: center; justify-content: space-between;
          gap: 12px; z-index: 30;
        }
        @media (max-width: 1023px) { .mob-bar { display: flex; } }
        .mob-bar__left { display: flex; flex-direction: column; gap: 2px; }
        .mob-bar__total {
          font-family: var(--fr-display);
          font-size: 22px; font-weight: 900; color: #111;
        }
        .mob-bar__items {
          font-family: var(--fr-mono); font-size: 11px; color: #888;
        }
        .mob-bar__cta {
          background: var(--fr-red); color: #fff; border: 0;
          padding: 12px 20px;
          font-family: var(--fr-display);
          font-size: 13px; font-weight: 900; letter-spacing: 0.08em;
          cursor: pointer;
        }
        .mob-bar__cta:disabled { background: #ccc; }
      `}</style>
    </div>
  );
}
