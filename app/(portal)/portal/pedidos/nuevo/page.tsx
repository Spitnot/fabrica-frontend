'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { getColorHex, parseVariant } from '@/lib/colors';
import { FR } from '@/components/fr/Atoms';
import Link from 'next/link';

interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; peso_kg: number; imagen?: string; }
interface ProductGroup { nombre: string; variantes: Product[]; imagen?: string; }
interface TarifaPrecio { sku: string; precio?: number | null; pack_size?: number | null; }
interface Tarifa { multiplicador: number; pack_size: number; minimum_order_value: number; hidden_products: string[]; precios?: TarifaPrecio[]; }
interface Customer {
  id: string; contacto_nombre?: string; first_name?: string; last_name?: string;
  company_name: string; descuento_pct: number;
  tarifa?: Tarifa | null;
  ship_street1?: string; ship_city?: string; ship_postal_code?: string; ship_country?: string;
  direccion_envio?: { street: string; city: string; postal_code: string; country: string; };
}
interface LineItem { sku: string; nombre_producto: string; variante?: string; cantidad: number; precio_unitario: number; peso_unitario: number; }

function computePrice(sku: string, shopifyPrice: number, tarifa?: Tarifa | null, descuento_pct?: number): number {
  if (!tarifa) return shopifyPrice;
  const specific = tarifa.precios?.find(p => p.sku === sku)?.precio;
  const base = specific != null ? specific : shopifyPrice * tarifa.multiplicador;
  return base * (1 - (descuento_pct ?? 0) / 100);
}

const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

const BLOCK_COLORS = ['#D93A35', '#E6883E', '#F6E451', '#0087B8', '#0DA265', '#876693', '#111111'];
function blockFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(h) % BLOCK_COLORS.length];
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customer, setCustomer]         = useState<Customer | null>(null);
  const [products, setProducts]         = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch]             = useState('');
  const [lineItems, setLineItems]       = useState<LineItem[]>([]);
  const [confirming, setConfirming]     = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const { data: cust } = await supabaseClient
        .from('customers')
        .select('id, contacto_nombre, first_name, last_name, company_name, descuento_pct, ship_street1, ship_city, ship_postal_code, ship_country, direccion_envio, tarifa:tarifa_id(multiplicador, pack_size, minimum_order_value, hidden_products, precios:tarifas_precios(sku, precio, pack_size))')
        .eq('auth_user_id', user.id)
        .single();
      if (cust) setCustomer(cust as unknown as Customer);
    }
    loadData();
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { setProducts(d.data ?? []); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));
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

  const subtotal    = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const itemCount   = lineItems.reduce((s, i) => s + i.cantidad, 0);
  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue;
  const canConfirm  = !!customer && lineItems.length > 0 && !belowMinimum;

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
      const precio = computePrice(p.sku, p.precio_mayorista, customer?.tarifa, customer?.descuento_pct);
      return [...prev, { sku: p.sku, nombre_producto: p.nombre_producto, variante: p.variante, cantidad: step, precio_unitario: precio, peso_unitario: p.peso_kg }];
    });
  }
  function removeProduct(p: Product) {
    const step = getPackStep(p.sku);
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (!ex) return prev;
      if (ex.cantidad <= step) return prev.filter(i => i.sku !== p.sku);
      return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad - step } : i);
    });
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
          coste_envio_estimado: null,
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

      {/* Client pill */}
      {customer && (
        <div style={{ display: 'flex', gap: 12, padding: '10px 14px', background: '#F7F7F2', border: '1px solid #111', alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, background: '#111', color: FR.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
            {(customer.first_name ?? customer.contacto_nombre ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{`${customer.first_name ?? customer.contacto_nombre ?? ''} ${customer.last_name ?? ''}`.trim()}</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', marginTop: 1 }}>{customer.company_name}</div>
          </div>
          {minimumOrderValue > 0 && (
            <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: belowMinimum && lineItems.length > 0 ? FR.orange : '#111' }}>
              MIN. {fmt(minimumOrderValue)}
            </div>
          )}
        </div>
      )}

      {/* Main grid — stacks on mobile */}
      <div className="portal-nuevo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <style>{`@media(max-width:800px){.portal-nuevo-grid{grid-template-columns:1fr!important}}`}</style>

        {/* LEFT: Catalogue */}
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
              <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111' }}>No products found.</div>
            ) : (
              <div className="portal-prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                <style>{`@media(max-width:480px){.portal-prod-grid{grid-template-columns:1fr!important}}`}</style>
                {productGroups.map(group => {
                  const block = blockFor(group.nombre);
                  const first = group.variantes[0];
                  const price = computePrice(first.sku, first.precio_mayorista, customer?.tarifa, customer?.descuento_pct);
                  return (
                    <div key={group.nombre} className="fr-card" style={{ overflow: 'hidden' }}>
                      {/* Color block / image */}
                      <div style={{ background: block, aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {group.imagen ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={group.imagen} alt={group.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                        ) : (
                          <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em', textAlign: 'center', padding: '0 8px' }}>
                            {group.nombre.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{group.nombre}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: customer?.tarifa ? FR.red : '#111', marginBottom: 8, fontWeight: 700 }}>
                          {fmt(price)}
                        </div>
                        {/* Variant dots */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {group.variantes.map(v => {
                            const qty = getQty(v.sku);
                            const { color } = parseVariant(v.variante);
                            const colorHex = color ? getColorHex(color) : null;
                            return (
                              <button
                                key={v.sku}
                                onClick={() => addProduct(v)}
                                title={`${v.variante ?? v.sku} — tap to add`}
                                style={{ position: 'relative', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', boxShadow: 'none' }}
                              >
                                {colorHex ? (
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: colorHex, border: qty > 0 ? '2.5px solid #111' : '1px solid rgba(0,0,0,0.2)' }} />
                                ) : (
                                  <span style={{ display: 'inline-block', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, padding: '3px 6px', border: '1px solid #111', background: qty > 0 ? '#111' : '#fff', color: qty > 0 ? '#fff' : '#111' }}>
                                    {v.variante ?? v.sku.slice(-3)}
                                  </span>
                                )}
                                {qty > 0 && (
                                  <span style={{ position: 'absolute', top: -7, right: -7, background: FR.red, color: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 8, fontWeight: 700, padding: '1px 3px', minWidth: 14, textAlign: 'center', lineHeight: 1.5 }}>
                                    {qty}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {/* In-cart qty controls */}
                        {group.variantes.some(v => getQty(v.sku) > 0) && (
                          <div style={{ borderTop: '1px solid #111', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {group.variantes.filter(v => getQty(v.sku) > 0).map(v => (
                              <div key={v.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{v.variante ?? v.sku}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <button onClick={() => removeProduct(v)} style={{ width: 22, height: 22, border: '1px solid #111', background: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>−</button>
                                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: FR.red, width: 18, textAlign: 'center' }}>{getQty(v.sku)}</span>
                                  <button onClick={() => addProduct(v)} style={{ width: 22, height: 22, border: '1px solid #111', background: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}>
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">ORDER SUMMARY</div>
            <div style={{ padding: 16 }}>
              {lineItems.length === 0 ? (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '16px 0' }}>
                  No products yet — tap a variant to add.
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
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="fr-label">{label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid #111', marginTop: 4 }}>
                  <span className="fr-label">TOTAL</span>
                  <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: FR.red }}>{fmt(subtotal)}</span>
                </div>
              </div>

              {belowMinimum && lineItems.length > 0 && (
                <div style={{ marginTop: 12, padding: '8px 12px', border: `2px solid ${FR.orange}`, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.orange }}>
                  ⚠ MINIMUM ORDER {fmt(minimumOrderValue)}. ADD {fmt(minimumOrderValue - subtotal)} MORE.
                </div>
              )}
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
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#111', textAlign: 'center' }}>
            Prices locked on confirmation
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="portal-mob-bar">
        <div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, color: '#111', letterSpacing: '-0.02em' }}>{fmt(subtotal)}</div>
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
