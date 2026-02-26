'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getColorHex, parseVariant } from '@/lib/colors';

interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; peso_kg: number; imagen?: string; }
interface ProductGroup { nombre: string; variantes: Product[]; imagen?: string; }
interface TarifaPrecio { sku: string; precio: number; }
interface Tarifa { id: string; nombre: string; multiplicador: number; precios?: TarifaPrecio[]; }
interface Customer { id: string; contacto_nombre: string; company_name: string; tarifa_id?: string; descuento_pct: number; tarifa?: Tarifa; direccion_envio: { street: string; city: string; postal_code: string; country: string; }; }
interface LineItem { sku: string; nombre_producto: string; variante?: string; cantidad: number; precio_unitario: number; peso_unitario: number; }
interface Quote { service_id: string; carrier: string; service_name: string; price: number; estimated_days: number; }

function computePrice(sku: string, shopifyPrice: number, tarifa?: Tarifa, descuento_pct?: number): number {
  if (!tarifa) return shopifyPrice;
  const specific = tarifa.precios?.find(p => p.sku === sku)?.precio;
  const base = specific != null ? specific : shopifyPrice * tarifa.multiplicador;
  return base * (1 - (descuento_pct ?? 0) / 100);
}

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [clientId, setClientId]       = useState('');
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

  // When customer changes, fetch their full tarifa (with per-SKU precios)
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
      ? products.filter(p => p.nombre_producto.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.variante ?? '').toLowerCase().includes(search.toLowerCase()))
      : products;
    const map = new Map<string, Product[]>();
    filtered.forEach(p => { const g = map.get(p.nombre_producto) ?? []; g.push(p); map.set(p.nombre_producto, g); });
    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes, imagen: variantes[0]?.imagen }));
  }, [products, search]);

  const client = customers.find(c => c.id === clientId);
  const subtotal = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const total = subtotal + (selectedQuote?.price ?? 0);
  const canConfirm = clientId && lineItems.length > 0;

  function getQty(sku: string) { return lineItems.find(i => i.sku === sku)?.cantidad ?? 0; }

  function addProduct(p: Product) {
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (ex) return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad + 1 } : i);
      const precio = computePrice(p.sku, p.precio_mayorista, clientTarifa, clientDescuento);
      return [...prev, { sku: p.sku, nombre_producto: p.nombre_producto, variante: p.variante, cantidad: 1, precio_unitario: precio, peso_unitario: p.peso_kg }];
    });
    setSelectedQuote(null); setQuotes([]);
  }

  function removeProduct(p: Product) {
    setLineItems(prev => {
      const ex = prev.find(i => i.sku === p.sku);
      if (!ex) return prev;
      if (ex.cantidad === 1) return prev.filter(i => i.sku !== p.sku);
      return prev.map(i => i.sku === p.sku ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
    setSelectedQuote(null); setQuotes([]);
  }

  async function requestQuotes() {
    if (!lineItems.length || !client) return;
    setQuotesLoading(true); setQuotes([]); setSelectedQuote(null);
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ peso: totalWeight, ancho: 30, alto: 20, largo: 30, destination: client.direccion_envio }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error quoting');
      setQuotes(data.data ?? []);
    } catch (err: any) { setError(err.message); }
    finally { setQuotesLoading(false); }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirming(true); setError('');
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: clientId, items: lineItems.map(i => ({ sku: i.sku, nombre_producto: i.nombre_producto + (i.variante ? ` - ${i.variante}` : ''), cantidad: i.cantidad, precio_unitario: i.precio_unitario, peso_unitario: i.peso_unitario })), coste_envio_estimado: selectedQuote?.price ?? null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating order');
      router.push(`/pedidos/${data.id}`);
    } catch (err: any) { setError(err.message); setConfirming(false); }
  }

  return (
    <div className="p-6 md:p-7">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wider uppercase text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>New Order</h1>
        <p className="text-xs text-gray-400 mt-0.5">Select client and products from the catalogue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-5">

          {/* Client */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">1 · Client</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none">
                <option value="">— Select a client —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.contacto_nombre} · {c.company_name}</option>)}
              </select>
              {client && (
                <div className="flex gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-[#D93A35] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {client.contacto_nombre.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">{client.contacto_nombre}</div>
                      {clientTarifa && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold border rounded uppercase tracking-wide text-[#876693] bg-purple-50 border-purple-200">
                          {clientTarifa.nombre}
                        </span>
                      )}
                      {clientDescuento > 0 && (
                        <span className="text-[10px] font-mono font-bold text-[#D93A35]">-{clientDescuento}%</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{client.company_name}</div>
                    <div className="font-mono text-xs text-gray-400 mt-0.5">{client.direccion_envio?.street} · {client.direccion_envio?.postal_code} {client.direccion_envio?.city}</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Catalogue */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">2 · Catalogue</span>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400">{products.length} products</span>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU or variant…"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none mb-4" />
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
                Loading catalogue…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {productGroups.map(group => (
                  <div key={group.nombre} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {group.imagen && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={group.imagen} alt={group.nombre} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">{group.nombre}</div>
                    <div className="space-y-2">
                      {group.variantes.map(v => {
                        const qty = getQty(v.sku);
                        const { color } = parseVariant(v.variante);
                        const colorHex = color ? getColorHex(color) : null;
                        return (
                          <div key={v.sku} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              {v.variante && (
                                <div className="flex items-center gap-1.5">
                                  {colorHex && <span className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style={{ backgroundColor: colorHex }} />}
                                  <div className="text-xs text-gray-500 truncate">{v.variante}</div>
                                </div>
                              )}
                              <div className="font-mono text-[10px] text-gray-400">{v.sku}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {qty > 0 ? (
                                <>
                                  <button onClick={() => removeProduct(v)} className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#D93A35]/40 text-sm transition-colors flex items-center justify-center">−</button>
                                  <span className="font-mono text-sm font-bold text-[#D93A35] w-5 text-center">{qty}</span>
                                  <button onClick={() => addProduct(v)} className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#D93A35]/40 text-sm transition-colors flex items-center justify-center">+</button>
                                </>
                              ) : (
                                <button onClick={() => addProduct(v)} className="px-2.5 py-1 text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:border-[#D93A35]/40 hover:text-[#D93A35] transition-colors">+ Add</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                      <span className={clientTarifa ? 'text-[#D93A35] font-semibold' : ''}>
                        {fmt(computePrice(group.variantes[0].sku, group.variantes[0].precio_mayorista, clientTarifa, clientDescuento))}
                        {clientTarifa && <span className="ml-1 font-normal text-[#D93A35]/70">{clientTarifa.nombre}</span>}
                      </span>
                      <span>{group.variantes[0].peso_kg} kg/u</span>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400" style={{ fontFamily: 'var(--font-alexandria)' }}>Order</span>
            </div>
            <div className="p-4">
              {lineItems.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-3">No products yet</div>
              ) : (
                <div className="space-y-2 mb-4">
                  {lineItems.map(item => (
                    <div key={item.sku} className="flex justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <div className="text-gray-700 truncate">{item.nombre_producto}</div>
                        {item.variante && <div className="text-gray-400">{item.variante}</div>}
                      </div>
                      <div className="text-gray-500 flex-shrink-0">{item.cantidad} × {fmt(item.precio_unitario)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5 border-t border-gray-100 pt-3">
                {[['Total weight', `${totalWeight.toFixed(2)} kg`], ['Subtotal', fmt(subtotal)], ['Shipping', selectedQuote ? fmt(selectedQuote.price) : '—']].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span><span className="text-gray-700">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-sm text-gray-900">Total</span>
                  <span className="font-black text-lg text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400" style={{ fontFamily: 'var(--font-alexandria)' }}>Shipping · Packlink</span>
              <button onClick={requestQuotes} disabled={!lineItems.length || !clientId || quotesLoading}
                className="px-2.5 py-1 text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:border-[#D93A35]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Quote
              </button>
            </div>
            <div className="p-4">
              {quotesLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                  <div className="w-3 h-3 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
                  Querying Packlink…
                </div>
              )}
              {!quotesLoading && quotes.length === 0 && <div className="text-xs text-gray-400 text-center py-2">Add products and quote</div>}
              {quotes.map(q => (
                <button key={q.service_id} onClick={() => setSelectedQuote(q)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg mb-1.5 last:mb-0 border transition-colors text-left ${selectedQuote?.service_id === q.service_id ? 'border-[#D93A35]/40 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{q.carrier}</div>
                    <div className="text-xs text-gray-400">{q.service_name}</div>
                    {q.estimated_days && <div className="text-xs text-gray-400">{q.estimated_days} days</div>}
                  </div>
                  <div className="text-sm font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(q.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">{error}</div>}

          <button onClick={handleConfirm} disabled={!canConfirm || confirming}
            className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-xl hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {confirming ? 'Creating order…' : 'Confirm Order'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">Prices and weights will be locked on confirmation</p>
        </div>
      </div>
    </div>
  );
}
