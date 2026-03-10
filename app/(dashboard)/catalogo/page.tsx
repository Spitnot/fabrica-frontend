'use client';

import { useState, useEffect } from 'react';
import { getColorHex, parseVariant } from '@/lib/colors';

type Fungible = { id: string; nombre: string; unidad: string };
type SkuFungibleItem = { id?: string; fungible_id: string; nombre: string; unidad: string; cantidad: string };
type Variant = { sku: string; variante?: string; precio: number; peso_kg: number };
type Product = { id: string; title: string; image?: string; variants: Variant[] };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:border-[#D93A35] transition-colors bg-white';

export default function CatalogoPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [fungibles, setFungibles]         = useState<Fungible[]>([]);
  const [expandedSku, setExpandedSku]     = useState<string | null>(null);
  const [skuItems, setSkuItems]           = useState<SkuFungibleItem[]>([]);
  const [skuLoading, setSkuLoading]       = useState(false);
  const [skuSaving, setSkuSaving]         = useState(false);
  const [skuSaveOk, setSkuSaveOk]         = useState(false);
  const [showFungMgr, setShowFungMgr]     = useState(false);
  const [newFungNombre, setNewFungNombre] = useState('');
  const [newFungUnidad, setNewFungUnidad] = useState('ml');
  const [fungSaving, setFungSaving]       = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, Product> = {};
        (d.data ?? []).forEach((v: any) => {
          const key = v.nombre_producto;
          if (!map[key]) map[key] = { id: key, title: v.nombre_producto, image: v.imagen, variants: [] };
          map[key].variants.push({ sku: v.sku, variante: v.variante, precio: v.precio_mayorista, peso_kg: v.peso_kg });
        });
        setProducts(Object.values(map));
        setLoading(false);
      });
    loadFungibles();
  }, []);

  async function loadFungibles() {
    const res = await fetch('/api/fungibles');
    const json = await res.json();
    setFungibles(json.data ?? []);
  }

  async function openSku(sku: string) {
    if (expandedSku === sku) { setExpandedSku(null); return; }
    setExpandedSku(sku);
    setSkuLoading(true);
    setSkuSaveOk(false);
    const res = await fetch(`/api/sku-fungibles?sku=${sku}`);
    const json = await res.json();
    setSkuItems((json.data ?? []).map((sf: any) => {
      const f = Array.isArray(sf.fungible) ? sf.fungible[0] : sf.fungible;
      return { id: sf.id, fungible_id: f.id, nombre: f.nombre, unidad: f.unidad, cantidad: String(sf.cantidad) };
    }));
    setSkuLoading(false);
  }

  function addFungibleLine() {
    if (!fungibles.length) return;
    const f = fungibles[0];
    setSkuItems(prev => [...prev, { fungible_id: f.id, nombre: f.nombre, unidad: f.unidad, cantidad: '' }]);
  }

  function updateLine(idx: number, field: 'fungible_id' | 'cantidad', value: string) {
    setSkuItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'fungible_id') {
        const f = fungibles.find(f => f.id === value);
        return { ...item, fungible_id: value, nombre: f?.nombre ?? '', unidad: f?.unidad ?? 'ml' };
      }
      return { ...item, cantidad: value };
    }));
  }

  function removeLine(idx: number) {
    setSkuItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveSku(sku: string) {
    setSkuSaving(true);
    await fetch('/api/sku-fungibles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        items: skuItems.map(i => ({ fungible_id: i.fungible_id, cantidad: parseFloat(i.cantidad) || 0 })),
      }),
    });
    setSkuSaving(false);
    setSkuSaveOk(true);
    setTimeout(() => setSkuSaveOk(false), 2000);
  }

  async function createFungible() {
    if (!newFungNombre.trim()) return;
    setFungSaving(true);
    await fetch('/api/fungibles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newFungNombre.trim(), unidad: newFungUnidad }),
    });
    setNewFungNombre('');
    setNewFungUnidad('ml');
    setFungSaving(false);
    loadFungibles();
  }

  async function deleteFungible(id: string) {
    await fetch(`/api/fungibles/${id}`, { method: 'DELETE' });
    loadFungibles();
  }

  return (
    <div className="p-6 md:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Shopify Catalog</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? '…' : `${products.length} products`} · Click a SKU row to assign fungibles
          </p>
        </div>
        <button onClick={() => setShowFungMgr(true)}
          className="px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
          </svg>
          Manage Fungibles
        </button>
      </div>

      {showFungMgr && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-black tracking-wide uppercase text-gray-900"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Fungibles</span>
              <button onClick={() => setShowFungMgr(false)} className="text-gray-300 hover:text-gray-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {fungibles.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No fungibles yet</div>
              ) : fungibles.map(f => (
                <div key={f.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium text-gray-900">{f.nombre}</span>
                  <span className="font-mono text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{f.unidad}</span>
                  <button onClick={() => deleteFungible(f.id)}
                    className="text-gray-300 hover:text-[#D93A35] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Add new fungible</div>
              <div className="flex gap-2">
                <input value={newFungNombre} onChange={e => setNewFungNombre(e.target.value)}
                  placeholder="Name (e.g. Red Paint)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D93A35] transition-colors"
                  onKeyDown={e => e.key === 'Enter' && createFungible()} />
                <select value={newFungUnidad} onChange={e => setNewFungUnidad(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#D93A35] transition-colors bg-white">
                  {['ml', 'L', 'g', 'kg', 'u'].map(u => <option key={u}>{u}</option>)}
                </select>
                <button onClick={createFungible} disabled={fungSaving || !newFungNombre.trim()}
                  className="px-4 py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-16 text-center text-sm text-gray-400">
          No products found. Check Shopify credentials.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Product', 'SKU', 'Color', 'Size', 'Price', 'Weight', 'Fungibles'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.flatMap(product =>
                  product.variants.map((variant, vi) => {
                    const { color, size } = parseVariant(variant.variante);
                    const colorHex = color ? getColorHex(color) : null;
                    const isOpen = expandedSku === variant.sku;
                    return (
                      <>
                        <tr key={`${product.id}-${variant.sku}`}
                          className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer ${isOpen ? 'bg-red-50/30' : ''}`}
                          onClick={() => openSku(variant.sku)}>
                          <td className="px-5 py-3">
                            {vi === 0 ? (
                              <div className="flex items-center gap-3">
                                {product.image ? (
                                  <img src={product.image} alt={product.title}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100 shadow-sm" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                                )}
                                <span className="text-sm font-semibold text-gray-900 leading-tight max-w-[180px]">{product.title}</span>
                              </div>
                            ) : <div className="pl-[52px]" />}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{variant.sku}</td>
                          <td className="px-5 py-3">
                            {color ? (
                              <div className="flex items-center gap-2">
                                {colorHex && <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10" style={{ backgroundColor: colorHex }} />}
                                <span className="text-xs text-gray-600">{color}</span>
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">{size ?? '—'}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(variant.precio)}</td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-400">{variant.peso_kg} kg</td>
                          <td className="px-5 py-3">
                            <span className="text-[10px] text-[#D93A35] font-semibold">{isOpen ? 'Close ↑' : 'Edit →'}</span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${variant.sku}-fungibles`} className="bg-gray-50/80 border-b border-gray-100">
                            <td colSpan={7} className="px-6 py-4">
                              {skuLoading ? (
                                <div className="text-xs text-gray-400">Loading…</div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                    Fungibles for <span className="font-mono text-gray-600">{variant.sku}</span>
                                  </div>
                                  {skuItems.length === 0 && (
                                    <div className="text-xs text-gray-400">No fungibles assigned yet.</div>
                                  )}
                                  <div className="space-y-2">
                                    {skuItems.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <select value={item.fungible_id}
                                          onChange={e => updateLine(idx, 'fungible_id', e.target.value)}
                                          className={`${inputCls} w-48`}>
                                          {fungibles.map(f => (
                                            <option key={f.id} value={f.id}>{f.nombre} ({f.unidad})</option>
                                          ))}
                                        </select>
                                        <input type="number" min="0" step="0.1"
                                          value={item.cantidad}
                                          onChange={e => updateLine(idx, 'cantidad', e.target.value)}
                                          placeholder="qty"
                                          className={`${inputCls} w-20`} />
                                        <span className="text-xs text-gray-400 font-mono">{item.unidad} / unit</span>
                                        <button onClick={() => removeLine(idx)}
                                          className="text-gray-300 hover:text-[#D93A35] transition-colors ml-1">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-3 pt-1">
                                    {fungibles.length > 0 ? (
                                      <button onClick={addFungibleLine}
                                        className="text-xs font-semibold text-[#D93A35] hover:text-[#b52e2a] transition-colors flex items-center gap-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M12 5v14M5 12h14"/>
                                        </svg>
                                        Add fungible
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400">Create fungibles first using the button above.</span>
                                    )}
                                    <button onClick={() => saveSku(variant.sku)} disabled={skuSaving}
                                      className="ml-auto px-4 py-1.5 bg-[#D93A35] text-white text-xs font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                                      {skuSaving ? 'Saving…' : 'Save'}
                                    </button>
                                    {skuSaveOk && <span className="text-xs text-[#0DA265] font-semibold">Saved ✓</span>}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
