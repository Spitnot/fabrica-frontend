'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getColorHex, parseVariant } from '@/lib/colors';
import { FR } from '@/components/fr/Atoms';
import Link from 'next/link';

interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; peso_kg: number; imagen?: string; }
interface ProductGroup { nombre: string; variantes: Product[]; imagen?: string; }
interface TarifaPrecio { sku: string; precio?: number | null; }
interface Tarifa { multiplicador: number; pack_size: number; minimum_order_value: number; hidden_products: string[]; nombre: string; precios?: TarifaPrecio[]; }
interface Customer {
  id: string; contacto_nombre?: string; first_name?: string; last_name?: string;
  company_name: string; descuento_pct: number;
  tarifa?: Tarifa | null;
  ship_street1?: string; ship_city?: string; ship_postal_code?: string; ship_country?: string;
}
interface LineItem { sku: string; nombre_producto: string; variante?: string; cantidad: number; precio_unitario: number; peso_unitario: number; }
interface Quote { service_id: string; carrier: string; service_name: string; price: number; estimated_days: number; }

function computePrice(sku: string, shopifyPrice: number, tarifa?: Tarifa | null, descuento_pct?: number): number {
  if (!tarifa) return shopifyPrice;
  const specific = tarifa.precios?.find(p => p.sku === sku)?.precio;
  const base = specific != null ? specific : shopifyPrice * tarifa.multiplicador;
  return base * (1 - (descuento_pct ?? 0) / 100);
}

const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

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
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerError, setCustomerError]     = useState('');

  useEffect(() => {
    fetch('/api/portal/me')
      .then(r => r.json())
      .then(d => {
        if (d.data) setCustomer(d.data as Customer);
        else setCustomerError(d.error ?? 'Could not load your account data. Please refresh or contact us.');
      })
      .catch(() => setCustomerError('Could not load your account data. Please refresh or contact us.'))
      .finally(() => setCustomerLoading(false));
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { setProducts(d.data ?? []); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));
  }, []);

  const hiddenProducts: string[] = customer?.tarifa?.hidden_products ?? [];
  const minimumOrderValue: number = customer?.tarifa?.minimum_order_value ?? 0;

  const clientAddress = customer?.ship_street1
    ? { street: customer.ship_street1, city: customer.ship_city ?? '', postal_code: customer.ship_postal_code ?? '', country: customer.ship_country ?? '' }
    : undefined;
  const clientAddressOk = !!(clientAddress?.country && clientAddress?.postal_code);

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

  const subtotal    = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const total       = subtotal + (selectedQuote?.price ?? 0);
  const itemCount   = lineItems.reduce((s, i) => s + i.cantidad, 0);
  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue;
  const canConfirm  = !!customer && lineItems.length > 0 && !belowMinimum;

  function getQty(sku: string) { return lineItems.find(i => i.sku === sku)?.cantidad ?? 0; }
  function getPackStep(_sku: string): number {
    return customer?.tarifa?.pack_size ?? 1;
  }

  function addProduct(p: Product) {
    const step = getPackStep(p.sku);
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (ex) return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad + step } : i);
      const precio = computePrice(p.sku, p.precio_mayorista, customer?.tarifa, customer?.descuento_pct);
      return [...prev, { sku: p.sku, nombre_producto: p.nombre_producto, variante: p.variante, cantidad: step, precio_unitario: precio, peso_unitario: p.peso_kg }];
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
      // Estimate box dimensions from weight (spray cans ≈ 0.28 kg/L packed).
      // Proportions 3:2:3 (W:H:L). At 5 kg → 30×20×30 cm, scales with cbrt.
      const DENSITY = 0.28;
      const vol = Math.max(totalWeight, 0.5) / DENSITY * 1000; // cm³
      const x   = Math.cbrt(vol / 18); // 18 = 3×2×3
      const ancho = Math.max(15, Math.ceil(3 * x));
      const alto  = Math.max(10, Math.ceil(2 * x));
      const largo = Math.max(15, Math.ceil(3 * x));
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso: totalWeight, ancho, alto, largo, destination: clientAddress }),
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
      const res = await fetch('/api/pedidos', {
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

  return (
    <div className="fr-page" style={{ paddingBottom: 90 }}>

      {/* Header */}
      <div>
        <Link href="/portal" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#111', textDecoration: 'none' }}>
          ← MY ORDERS
        </Link>
        <div style={{ marginTop: 12, fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
          NEW ORDER<span style={{ color: FR.red }}>.</span>
        </div>
      </div>

      {/* Client pill / error */}
      {customerLoading && !customer && (
        <div style={{ padding: '10px 14px', background: '#F7F7F2', border: '1px solid #111', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111' }}>
          LOADING ACCOUNT…
        </div>
      )}
      {customerError && !customer && (
        <div style={{ padding: '10px 14px', border: `2px solid ${FR.red}`, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red }}>
          ✕ {customerError}
        </div>
      )}
      {customer && (
        <div style={{ display: 'flex', gap: 12, padding: '10px 14px', background: '#F7F7F2', border: '1px solid #111', alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, background: '#111', color: FR.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
            {(customer.first_name ?? customer.contacto_nombre ?? '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{`${customer.first_name ?? customer.contacto_nombre ?? ''} ${customer.last_name ?? ''}`.trim()}</span>
              {customer.tarifa && (
                <span style={{ padding: '2px 8px', border: '1px solid #111', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', background: '#111', color: FR.yellow }}>
                  {customer.tarifa.nombre}
                </span>
              )}
              {(customer.descuento_pct ?? 0) > 0 && (
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red, fontWeight: 700 }}>−{customer.descuento_pct}%</span>
              )}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', marginTop: 1 }}>
              {customer.company_name}
              {clientAddress && ` · ${clientAddress.postal_code} ${clientAddress.city}`}
            </div>
          </div>
          {minimumOrderValue > 0 && (
            <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: belowMinimum && lineItems.length > 0 ? FR.orange : '#111', flexShrink: 0 }}>
              MIN. {fmt(minimumOrderValue)}
            </div>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="portal-nuevo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <style>{`@media(max-width:800px){.portal-nuevo-grid{grid-template-columns:1fr!important}}`}</style>

        {/* LEFT: Catalogue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">
              <span>CATALOGUE</span>
              <span>{productGroups.length} PRODUCTS</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU or variant…"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 12px', background: '#fff', outline: 'none', width: '100%' }}
              />

              {loadingProducts ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111' }}>LOADING CATALOGUE…</div>
              ) : productGroups.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111' }}>
                  {search.length >= 2 ? 'No products match.' : 'No products found.'}
                </div>
              ) : (
                <div className="portal-prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <style>{`@media(max-width:480px){.portal-prod-grid{grid-template-columns:1fr!important}}`}</style>
                  {productGroups.map(group => (
                    <div key={group.nombre} className="fr-card" style={{ overflow: 'hidden' }}>
                      {group.imagen && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={group.imagen} alt={group.nombre} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', borderBottom: '1px solid #111' }} />
                      )}
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{group.nombre}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {group.variantes.map(v => {
                            const qty = getQty(v.sku);
                            const { color } = parseVariant(v.variante);
                            const colorHex = color ? getColorHex(color) : null;
                            return (
                              <div key={v.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                  {v.variante && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {colorHex && <span style={{ width: 8, height: 8, background: colorHex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />}
                                      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.variante}</div>
                                    </div>
                                  )}
                                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111' }}>{v.sku}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {qty > 0 ? (
                                    <>
                                      <button onClick={() => removeProduct(v)} style={{ width: 24, height: 24, border: '1px solid #111', background: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>−</button>
                                      <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: FR.red, width: 20, textAlign: 'center' }}>{qty}</span>
                                      <button onClick={() => addProduct(v)} style={{ width: 24, height: 24, border: '1px solid #111', background: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>+</button>
                                    </>
                                  ) : (
                                    <button onClick={() => addProduct(v)} style={{ padding: '3px 10px', border: '1px solid #111', background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: 'none' }}>+ ADD</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #111', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: '-0.02em', color: customer?.tarifa ? FR.red : '#111' }}>
                            {fmt(computePrice(group.variantes[0].sku, group.variantes[0].precio_mayorista, customer?.tarifa, customer?.descuento_pct))}
                            {customer?.tarifa && <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 500, fontSize: 9, color: '#111', marginLeft: 4 }}>{customer.tarifa.nombre}</span>}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111' }}>{group.variantes[0].peso_kg} kg/u</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Summary + Shipping */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}>

          {/* Order summary */}
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">ORDER SUMMARY</div>
            <div style={{ padding: 16 }}>
              {lineItems.length === 0 ? (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '16px 0' }}>
                  No products yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {lineItems.map(item => (
                    <div key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre_producto}</div>
                        {item.variante && <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111' }}>{item.variante}</div>}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', flexShrink: 0 }}>{item.cantidad} × {fmt(item.precio_unitario)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #111', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['WEIGHT', `${totalWeight.toFixed(2)} kg`],
                  ['SUBTOTAL', fmt(subtotal)],
                  ['SHIPPING', selectedQuote ? fmt(selectedQuote.price) : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="fr-label">{label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid #111', marginTop: 4 }}>
                  <span className="fr-label">TOTAL</span>
                  <span style={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: FR.red }}>{fmt(total)}</span>
                </div>
              </div>

              {belowMinimum && lineItems.length > 0 && (
                <div style={{ marginTop: 12, padding: '8px 12px', border: `2px solid ${FR.orange}`, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.orange }}>
                  ⚠ MINIMUM ORDER {fmt(minimumOrderValue)}. ADD {fmt(minimumOrderValue - subtotal)} MORE.
                </div>
              )}
            </div>
          </div>

          {/* Shipping / Packlink */}
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">
              <span>SHIPPING · PACKLINK</span>
              <button
                onClick={requestQuotes}
                disabled={!lineItems.length || !clientAddressOk || quotesLoading}
                title={customer && !clientAddressOk ? 'Your account has no country or postal code — contact us.' : undefined}
                style={{ padding: '3px 10px', border: '1px solid #111', background: '#fff', color: '#111', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: 'none' }}
              >
                QUOTE
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {quotesLoading && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', padding: '8px 0' }}>QUERYING PACKLINK…</div>
              )}
              {!quotesLoading && !customer && !customerLoading && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red, padding: '4px 0' }}>
                  ✕ ACCOUNT DATA UNAVAILABLE — cannot quote shipping
                </div>
              )}
              {!quotesLoading && customer && !clientAddressOk && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red, padding: '4px 0' }}>
                  ✕ NO SHIPPING ADDRESS ON YOUR ACCOUNT — contact us to add one
                </div>
              )}
              {!quotesLoading && customer && clientAddressOk && !lineItems.length && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '8px 0' }}>Add products to quote shipping</div>
              )}
              {!quotesLoading && quotes.length === 0 && clientAddressOk && lineItems.length > 0 && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '8px 0' }}>Click QUOTE to get shipping options</div>
              )}
              {quotes.map((q, i) => (
                <button
                  key={q.service_id}
                  onClick={() => setSelectedQuote(q)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', marginBottom: i < quotes.length - 1 ? 6 : 0,
                    border: '1px solid #111',
                    background: selectedQuote?.service_id === q.service_id ? '#F7F7F2' : '#fff',
                    cursor: 'pointer', textAlign: 'left', boxShadow: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{q.carrier}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111' }}>{q.service_name}{q.estimated_days ? ` · ${q.estimated_days}d` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', color: FR.red }}>{fmt(q.price)}</div>
                    {selectedQuote?.service_id === q.service_id && (
                      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: FR.green, fontWeight: 700 }}>✓ SELECTED</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', border: `1px solid ${FR.red}`, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red }}>
              ✕ {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!canConfirm || confirming}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: '0.14em', justifyContent: 'center' }}
          >
            {confirming ? 'CREATING ORDER…' : 'CONFIRM ORDER'}
          </button>
          {!canConfirm && !confirming && (
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: FR.red, textAlign: 'center' }}>
              {!customer && !customerLoading
                ? '✕ Account data could not be loaded — refresh the page'
                : !lineItems.length
                  ? '✕ Add at least one product to confirm'
                  : belowMinimum
                    ? `✕ Minimum order is ${fmt(minimumOrderValue)} — add ${fmt(minimumOrderValue - subtotal)} more`
                    : null}
            </div>
          )}
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111', textAlign: 'center' }}>
            Prices locked on confirmation · Shipping optional
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="portal-mob-bar">
        <div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, color: '#111', letterSpacing: '-0.02em' }}>{fmt(total)}</div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
        </div>
        <button
          disabled={!canConfirm || confirming}
          onClick={handleConfirm}
          className="btn-primary"
          style={{ padding: '12px 20px', fontSize: 11, letterSpacing: '0.1em' }}
        >
          {confirming ? '…' : 'CONFIRM'}
        </button>
      </div>
      <style>{`
        .portal-mob-bar {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-top: 2px solid #111;
          padding: 10px 16px;
          align-items: center; justify-content: space-between;
          gap: 12px; z-index: 30;
        }
        @media (max-width: 800px) { .portal-mob-bar { display: flex; } }
      `}</style>
    </div>
  );
}
