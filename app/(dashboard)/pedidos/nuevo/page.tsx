'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getColorHex, parseVariant } from '@/lib/colors';
import { BackLink, FR } from '@/components/fr/Atoms';

interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; peso_kg: number; imagen?: string; }
interface ProductGroup { nombre: string; variantes: Product[]; imagen?: string; }
interface TarifaPrecio { sku: string; precio: number; pack_size?: number | null; }
interface Tarifa { id: string; nombre: string; multiplicador: number; precios?: TarifaPrecio[]; pack_size: number; minimum_order_value: number; }
interface Customer { id: string; first_name?: string; last_name?: string; contacto_nombre?: string; company_name: string; tarifa_id?: string; descuento_pct: number; tarifa?: Tarifa; direccion_envio?: { street: string; city: string; postal_code: string; country: string; }; ship_street1?: string; ship_city?: string; ship_postal_code?: string; ship_country?: string; }
interface LineItem { sku: string; nombre_producto: string; variante?: string; cantidad: number; precio_unitario: number; peso_unitario: number; }
interface Quote { service_id: string; carrier: string; service_name: string; price: number; estimated_days: number; }

function computePrice(sku: string, shopifyPrice: number, tarifa?: Tarifa, descuento_pct?: number): number {
  if (!tarifa) return shopifyPrice;
  const specific = tarifa.precios?.find(p => p.sku === sku)?.precio;
  const base = specific != null ? specific : shopifyPrice * tarifa.multiplicador;
  return base * (1 - (descuento_pct ?? 0) / 100);
}

const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

const monoLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#888',
};

const sectionHead: React.CSSProperties = {
  padding: '12px 16px', background: '#111', color: '#fff',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

function NuevoPedidoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [clientId, setClientId]       = useState(searchParams.get('cliente') ?? '');
  const [clientTarifa, setClientTarifa] = useState<Tarifa | undefined>(undefined);
  const [clientDescuento, setClientDescuento] = useState(0);
  const [search, setSearch]           = useState('');
  const [lineItems, setLineItems]     = useState<LineItem[]>([]);
  const [quotes, setQuotes]           = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.data ?? []));
    fetch('/api/products').then(r => r.json()).then(d => { setProducts(d.data ?? []); setLoadingProducts(false); });
  }, []);

  useEffect(() => {
    if (!clientId) { setClientTarifa(undefined); setClientDescuento(0); return; }
    fetch(`/api/customers/${clientId}`)
      .then(r => r.json())
      .then(d => {
        setClientTarifa(d.customer?.tarifa ?? undefined);
        setClientDescuento(d.customer?.descuento_pct ?? 0);
      });
  }, [clientId]);

  const productGroups = useMemo<ProductGroup[]>(() => {
    const filtered = search.length >= 2
      ? products.filter(p =>
          p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.variante ?? '').toLowerCase().includes(search.toLowerCase()))
      : products;
    const map = new Map<string, Product[]>();
    filtered.forEach(p => { const g = map.get(p.nombre_producto) ?? []; g.push(p); map.set(p.nombre_producto, g); });
    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes, imagen: variantes[0]?.imagen }));
  }, [products, search]);

  const client = customers.find(c => c.id === clientId);
  const clientAddress = client?.ship_street1
    ? { street: client.ship_street1, city: client.ship_city ?? '', postal_code: client.ship_postal_code ?? '', country: client.ship_country ?? '' }
    : client?.direccion_envio;
  const clientAddressOk = !!(clientAddress?.country && clientAddress?.postal_code);
  const subtotal = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const total = subtotal + (selectedQuote?.price ?? 0);
  const minimumOrderValue: number = clientTarifa?.minimum_order_value ?? 0;
  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue;
  const canConfirm = !!(clientId && lineItems.length > 0);

  function getQty(sku: string) { return lineItems.find(i => i.sku === sku)?.cantidad ?? 0; }

  function getPackStep(sku: string): number {
    const skuPs = clientTarifa?.precios?.find(pr => pr.sku === sku)?.pack_size;
    if (skuPs != null && skuPs > 0) return skuPs;
    return clientTarifa?.pack_size ?? 1;
  }

  function addProduct(p: Product) {
    const step = getPackStep(p.sku);
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (ex) return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad + step } : i);
      const precio = computePrice(p.sku, p.precio_mayorista, clientTarifa, clientDescuento);
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
    if (!lineItems.length || !client) return;
    setQuotesLoading(true); setQuotes([]); setSelectedQuote(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso: totalWeight, ancho: 30, alto: 20, largo: 30, destination: clientAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error quoting');
      setQuotes(data.data ?? []);
    } catch (err: any) { setError(err.message); }
    finally { setQuotesLoading(false); }
  }

  async function handleConfirm() {
    if (!canConfirm || !client) return;
    setConfirming(true); setError('');
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: clientId,
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
      router.push(`/pedidos/${data.id}`);
    } catch (err: any) { setError(err.message); setConfirming(false); }
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <BackLink href="/pedidos">ORDERS</BackLink>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
            NEW ORDER<span style={{ color: FR.red }}>.</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 1 · Client */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHead}>
              <span>1 · CLIENT</span>
              {client && <span style={{ color: FR.yellow }}>{client.company_name}</span>}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, border: 'var(--border-dash)', borderRadius: 0, padding: '8px 12px', background: '#fff', color: '#111', outline: 'none', width: '100%' }}
              >
                <option value="">— Select a client —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {`${c.first_name ?? c.contacto_nombre ?? ''} ${c.last_name ?? ''}`.trim()} · {c.company_name}
                  </option>
                ))}
              </select>

              {client && (
                <div style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--fr-cream)', border: 'var(--border-light)' }}>
                  <div style={{ width: 32, height: 32, background: '#111', color: FR.yellow, border: 'var(--border-dash)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                    {(client.first_name ?? client.contacto_nombre ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{`${client.first_name ?? client.contacto_nombre ?? ''} ${client.last_name ?? ''}`.trim()}</span>
                      {clientTarifa && (
                        <span style={{ padding: '2px 8px', border: 'var(--border-dash)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', background: '#111', color: FR.yellow }}>
                          {clientTarifa.nombre}
                        </span>
                      )}
                      {clientDescuento > 0 && (
                        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red, fontWeight: 700 }}>−{clientDescuento}%</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', marginTop: 2 }}>
                      {clientAddress?.street} · {clientAddress?.postal_code} {clientAddress?.city}
                    </div>
                  </div>
                </div>
              )}

              {minimumOrderValue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: belowMinimum && lineItems.length > 0 ? FR.orange : '#111' }}>
                  <span>TIER MINIMUM</span>
                  <span style={{ fontWeight: 700 }}>{fmt(minimumOrderValue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2 · Catalogue */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHead}>
              <span>2 · CATALOGUE</span>
              <span style={{ color: '#111' }}>{products.length} PRODUCTS</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU or variant…"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: 'var(--border-dash)', borderRadius: 0, padding: '8px 12px', background: '#fff', outline: 'none', width: '100%' }}
              />

              {loadingProducts ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#888' }}>
                  LOADING CATALOGUE…
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {productGroups.map(group => (
                    <div key={group.nombre} style={{ border: 'var(--border-dash)', background: '#fff', overflow: 'hidden' }}>
                      {group.imagen && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={group.imagen} alt={group.nombre} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', borderBottom: 'var(--border-dash)' }} />
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
                                      <button onClick={() => removeProduct(v)} style={{ width: 24, height: 24, border: 'var(--border-dash)', background: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>−</button>
                                      <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: FR.red, width: 20, textAlign: 'center' }}>{qty}</span>
                                      <button onClick={() => addProduct(v)} style={{ width: 24, height: 24, border: 'var(--border-dash)', background: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'none' }}>+</button>
                                    </>
                                  ) : (
                                    <button onClick={() => addProduct(v)} style={{ padding: '3px 10px', border: 'var(--border-dash)', background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: 'none' }}>+ ADD</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: 'var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: '-0.02em', color: clientTarifa ? FR.red : '#111' }}>
                            {fmt(computePrice(group.variantes[0].sku, group.variantes[0].precio_mayorista, clientTarifa, clientDescuento))}
                            {clientTarifa && <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 500, fontSize: 9, color: '#888', marginLeft: 4 }}>{clientTarifa.nombre}</span>}
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

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 16 }}>

          {/* Order summary */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHead}>ORDER SUMMARY</div>
            <div style={{ padding: 16 }}>
              {lineItems.length === 0 ? (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '16px 0' }}>No products yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {lineItems.map(item => (
                    <div key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre_producto}</div>
                        {item.variante && <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#888' }}>{item.variante}</div>}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', flexShrink: 0 }}>{item.cantidad} × {fmt(item.precio_unitario)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: 'var(--border-light)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['WEIGHT', `${totalWeight.toFixed(2)} kg`],
                  ['SUBTOTAL', fmt(subtotal)],
                  ['SHIPPING', selectedQuote ? fmt(selectedQuote.price) : '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={monoLabel}>{label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: 'var(--border-dash)', marginTop: 4 }}>
                  <span style={monoLabel}>TOTAL</span>
                  <span style={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: FR.red }}>{fmt(total)}</span>
                </div>
              </div>

              {belowMinimum && lineItems.length > 0 && (
                <div style={{ marginTop: 12, padding: '8px 12px', border: `2px solid ${FR.orange}`, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.orange }}>
                  ⚠ BELOW TIER MINIMUM ({fmt(minimumOrderValue)}). Admin can still confirm.
                </div>
              )}
            </div>
          </div>

          {/* Shipping / Packlink */}
          <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
            <div style={sectionHead}>
              <span>SHIPPING · PACKLINK</span>
              <button
                onClick={requestQuotes}
                disabled={!lineItems.length || !clientId || !clientAddressOk || quotesLoading}
                title={clientId && !clientAddressOk ? 'Client address is missing country or postal code' : undefined}
                style={{ padding: '4px 10px', border: '1px solid #fff', background: 'transparent', color: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: 'none' }}
              >
                QUOTE
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {quotesLoading && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888', padding: '8px 0' }}>QUERYING PACKLINK…</div>
              )}
              {clientId && !clientAddressOk && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red, padding: '4px 0' }}>
                  ✕ CLIENT HAS NO COUNTRY / POSTAL CODE
                </div>
              )}
              {!quotesLoading && quotes.length === 0 && clientAddressOk && (
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', textAlign: 'center', padding: '8px 0' }}>Add products and quote</div>
              )}
              {quotes.map((q, i) => (
                <button
                  key={q.service_id}
                  onClick={() => setSelectedQuote(q)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', marginBottom: i < quotes.length - 1 ? 6 : 0,
                    border: selectedQuote?.service_id === q.service_id ? `var(--border-dash)` : 'var(--border-light)',
                    background: selectedQuote?.service_id === q.service_id ? 'var(--fr-cream)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', boxShadow: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{q.carrier}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#888' }}>{q.service_name}{q.estimated_days ? ` · ${q.estimated_days}d` : ''}</div>
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
            <div style={{ padding: '10px 12px', border: `var(--border-dash)`, borderColor: FR.red, background: '#fff', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red }}>
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
            Prices and weights locked on confirmation
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NuevoPedidoPage() {
  return (
    <Suspense>
      <NuevoPedidoContent />
    </Suspense>
  );
}
