'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  sku: string;
  nombre_producto: string;
  variante?: string;
  precio_mayorista: number;
  peso_kg: number;
}

interface ProductGroup {
  nombre: string;
  variantes: Product[];
}

interface Customer {
  id: string;
  contacto_nombre: string;
  company_name: string;
  direccion_envio: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

interface LineItem {
  sku: string;
  nombre_producto: string;
  variante?: string;
  cantidad: number;
  precio_unitario: number;
  peso_unitario: number;
}

interface Quote {
  service_id: string;
  carrier: string;
  service_name: string;
  price: number;
  estimated_days: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function NuevoPedidoPage() {
  const router = useRouter();

  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [clientId, setClientId]           = useState('');
  const [search, setSearch]               = useState('');
  const [lineItems, setLineItems]         = useState<LineItem[]>([]);
  const [quotes, setQuotes]               = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [confirming, setConfirming]       = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []));

    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data ?? []);
        setLoadingProducts(false);
      });
  }, []);

  // Agrupar productos por nombre
  const productGroups = useMemo<ProductGroup[]>(() => {
    const filtered = search.length >= 2
      ? products.filter(
          (p) =>
            p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            (p.variante ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : products;

    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const group = map.get(p.nombre_producto) ?? [];
      group.push(p);
      map.set(p.nombre_producto, group);
    });

    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes }));
  }, [products, search]);

  const client = customers.find((c) => c.id === clientId);
  const subtotal = lineItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalWeight = lineItems.reduce((s, i) => s + i.peso_unitario * i.cantidad, 0);
  const total = subtotal + (selectedQuote?.price ?? 0);
  const canConfirm = clientId && lineItems.length > 0;

  function getQty(sku: string) {
    return lineItems.find((i) => i.sku === sku)?.cantidad ?? 0;
  }

  function addProduct(p: Product) {
    setLineItems((prev) => {
      const existing = prev.find((i) => i.sku === p.sku);
      if (existing) return prev.map((i) => i.sku === p.sku ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, {
        sku: p.sku,
        nombre_producto: p.nombre_producto,
        variante: p.variante,
        cantidad: 1,
        precio_unitario: p.precio_mayorista,
        peso_unitario: p.peso_kg,
      }];
    });
    setSelectedQuote(null);
    setQuotes([]);
  }

  function removeProduct(p: Product) {
    setLineItems((prev) => {
      const existing = prev.find((i) => i.sku === p.sku);
      if (!existing) return prev;
      if (existing.cantidad === 1) return prev.filter((i) => i.sku !== p.sku);
      return prev.map((i) => i.sku === p.sku ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
    setSelectedQuote(null);
    setQuotes([]);
  }

  async function requestQuotes() {
    if (!lineItems.length || !client) return;
    setQuotesLoading(true);
    setQuotes([]);
    setSelectedQuote(null);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: totalWeight,
          ancho: 30, alto: 20, largo: 30,
          destination: client.direccion_envio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cotizar');
      setQuotes(data.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuotesLoading(false);
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirming(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: clientId,
          items: lineItems.map((i) => ({
            sku:             i.sku,
            nombre_producto: i.nombre_producto + (i.variante ? ` - ${i.variante}` : ''),
            cantidad:        i.cantidad,
            precio_unitario: i.precio_unitario,
            peso_unitario:   i.peso_unitario,
          })),
          coste_envio_estimado: selectedQuote?.price ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear pedido');
      router.push(`/pedidos/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setConfirming(false);
    }
  }

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Nuevo Pedido</h1>
        <p className="text-xs text-zinc-500 mt-1">Selecciona cliente y productos del catálogo</p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5 items-start">

        {/* LEFT */}
        <div className="space-y-5">

          {/* Cliente */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">1 · Cliente</span>
              <div className="flex-1 h-px bg-[#282828]" />
            </div>
            <div className="bg-[#141414] border border-[#282828] rounded-lg p-4 space-y-3">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 outline-none"
              >
                <option value="">— Selecciona un cliente —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.contacto_nombre} · {c.company_name}</option>
                ))}
              </select>
              {client && (
                <div className="flex gap-3 p-3 bg-[#1c1c1c] border border-[#333] rounded-md">
                  <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                    {client.contacto_nombre.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">{client.contacto_nombre}</div>
                    <div className="text-xs text-zinc-400">{client.company_name}</div>
                    <div className="font-mono text-xs text-zinc-500 mt-0.5">
                      {client.direccion_envio?.street} · {client.direccion_envio?.postal_code} {client.direccion_envio?.city}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Catálogo */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">2 · Catálogo</span>
              <div className="flex-1 h-px bg-[#282828]" />
              <span className="text-[11px] text-zinc-600">{products.length} productos</span>
            </div>

            {/* Buscador */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o variante…"
              className="w-full bg-[#141414] border border-[#282828] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 outline-none mb-4"
            />

            {/* Grid de productos */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12 text-zinc-600 text-sm gap-2">
                <div className="w-4 h-4 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
                Cargando catálogo…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {productGroups.map((group) => (
                  <div key={group.nombre} className="bg-[#141414] border border-[#282828] rounded-lg p-4">
                    <div className="text-sm font-semibold text-zinc-200 mb-3">{group.nombre}</div>
                    <div className="space-y-2">
                      {group.variantes.map((v) => {
                        const qty = getQty(v.sku);
                        return (
                          <div key={v.sku} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              {v.variante && (
                                <div className="text-xs text-zinc-400 truncate">{v.variante}</div>
                              )}
                              <div className="font-mono text-[10px] text-zinc-600">{v.sku}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {qty > 0 ? (
                                <>
                                  <button
                                    onClick={() => removeProduct(v)}
                                    className="w-6 h-6 rounded bg-[#1c1c1c] border border-[#333] text-zinc-300 hover:border-amber-500 text-sm transition-colors flex items-center justify-center"
                                  >−</button>
                                  <span className="font-mono text-sm font-bold text-amber-400 w-5 text-center">{qty}</span>
                                  <button
                                    onClick={() => addProduct(v)}
                                    className="w-6 h-6 rounded bg-[#1c1c1c] border border-[#333] text-zinc-300 hover:border-amber-500 text-sm transition-colors flex items-center justify-center"
                                  >+</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => addProduct(v)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#1c1c1c] border border-[#333] rounded text-zinc-300 hover:border-amber-500/60 hover:text-amber-400 transition-colors"
                                >
                                  + Añadir
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex justify-between text-xs text-zinc-600">
                      <span>{fmt(group.variantes[0].precio_mayorista)}</span>
                      <span>{group.variantes[0].peso_kg} kg/u</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-3 sticky top-4">

          {/* Resumen del pedido */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Pedido</span>
            </div>
            <div className="p-4">
              {lineItems.length === 0 ? (
                <div className="text-xs text-zinc-600 text-center py-3">Sin productos aún</div>
              ) : (
                <div className="space-y-2 mb-4">
                  {lineItems.map((item) => (
                    <div key={item.sku} className="flex justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <div className="text-zinc-300 truncate">{item.nombre_producto}</div>
                        {item.variante && <div className="text-zinc-600">{item.variante}</div>}
                      </div>
                      <div className="text-zinc-400 flex-shrink-0">
                        {item.cantidad} × {fmt(item.precio_unitario)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5 border-t border-[#282828] pt-3">
                {[
                  ['Peso total', `${totalWeight.toFixed(2)} kg`],
                  ['Subtotal',   fmt(subtotal)],
                  ['Envío',      selectedQuote ? fmt(selectedQuote.price) : '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-zinc-300">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#282828]">
                  <span className="font-semibold text-sm text-zinc-200">Total</span>
                  <span className="font-bold text-lg text-amber-400">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cotización Packlink */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Envío · Packlink</span>
              <button
                onClick={requestQuotes}
                disabled={!lineItems.length || !clientId || quotesLoading}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#1c1c1c] border border-[#333] rounded text-zinc-300 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cotizar
              </button>
            </div>
            <div className="p-4">
              {quotesLoading && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                  <div className="w-3 h-3 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
                  Consultando Packlink…
                </div>
              )}
              {!quotesLoading && quotes.length === 0 && (
                <div className="text-xs text-zinc-600 text-center py-2">
                  Añade productos y cotiza
                </div>
              )}
              {quotes.map((q) => (
                <button
                  key={q.service_id}
                  onClick={() => setSelectedQuote(q)}
                  className={`w-full flex items-center justify-between p-3 rounded-md mb-1.5 last:mb-0 border transition-colors text-left ${
                    selectedQuote?.service_id === q.service_id
                      ? 'border-amber-500/60 bg-amber-500/5'
                      : 'border-[#282828] hover:border-[#333]'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{q.carrier}</div>
                    <div className="text-xs text-zinc-500">{q.service_name}</div>
                    {q.estimated_days && <div className="text-xs text-zinc-600">{q.estimated_days} días</div>}
                  </div>
                  <div className="text-sm font-bold text-amber-400">{fmt(q.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-950 border border-red-900 rounded-md text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!canConfirm || confirming}
            className="w-full py-3 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {confirming ? 'Creando pedido…' : 'Confirmar Pedido'}
          </button>
          <p className="text-[11px] text-zinc-600 text-center">
            Precios y pesos quedarán congelados al confirmar
          </p>
        </div>
      </div>
    </div>
  );
}
