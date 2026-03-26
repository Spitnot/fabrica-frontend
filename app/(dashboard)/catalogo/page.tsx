'use client';

import { useState, useEffect } from 'react';
import { getColorHex, parseVariant } from '@/lib/colors';

type Fungible = { id: string; nombre: string; unidad: string };
type SkuFungibleItem = { id?: string; fungible_id: string; nombre: string; unidad: string; cantidad: string };
type Variant = { sku: string; variante?: string; precio: number; peso_kg: number };
type Product = { id: string; title: string; image?: string; variants: Variant[] };

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

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

  const inputSt: React.CSSProperties = {
    fontFamily: 'var(--font-main)', fontSize: 11,
    border: '1px solid #111', borderRadius: 0,
    padding: '5px 8px', background: '#fff', color: '#111', outline: 'none',
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Catalog</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
            {loading ? '…' : `${products.length} products`} · Click a variant to assign materials
          </div>
        </div>
        <button onClick={() => setShowFungMgr(true)} className="btn-ghost">⚙ Manage Materials</button>
      </div>

      {/* Fungibles modal */}
      {showFungMgr && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-label">Raw Materials</span>
              <button onClick={() => setShowFungMgr(false)} style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#aaa', fontSize: 16, padding: '0 4px' }}>✕</button>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {fungibles.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 11, color: '#aaa' }}>No materials yet</div>
              ) : fungibles.map(f => (
                <div key={f.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#111' }}>{f.nombre}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa', background: '#f7f7f2', padding: '2px 6px', border: '1px solid #eee' }}>{f.unidad}</span>
                  <button
                    onClick={() => deleteFungible(f.id)}
                    style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#ddd', padding: '2px 4px', minHeight: 'auto', fontSize: 16 }}
                  >×</button>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Add new material</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newFungNombre} onChange={e => setNewFungNombre(e.target.value)}
                  placeholder="Name (e.g. Red Paint)"
                  style={{ ...inputSt, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && createFungible()}
                />
                <select value={newFungUnidad} onChange={e => setNewFungUnidad(e.target.value)} style={{ ...inputSt, width: 70 }}>
                  {['ml', 'L', 'g', 'kg', 'u'].map(u => <option key={u}>{u}</option>)}
                </select>
                <button onClick={createFungible} disabled={fungSaving || !newFungNombre.trim()} className="btn-primary">
                  {fungSaving ? '…' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#aaa' }}>Loading catalog…</div>
      ) : products.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#aaa' }}>No products found. Check Shopify credentials.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(product => (
            <div key={product.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Product header */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                {product.image ? (
                  <img src={product.image} alt={product.title} style={{ width: 32, height: 32, objectFit: 'cover', border: '1px solid #eee', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, background: '#eee', border: '1px solid #ddd', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.title}
                  </div>
                  <div style={{ fontSize: 9, color: '#aaa', marginTop: 1 }}>{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Variants */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {product.variants.map((variant) => {
                  const { color, size } = parseVariant(variant.variante);
                  const colorHex = color ? getColorHex(color) : null;
                  const isOpen = expandedSku === variant.sku;

                  return (
                    <div key={variant.sku}>
                      {/* Variant row */}
                      <div
                        onClick={() => openSku(variant.sku)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', cursor: 'pointer',
                          borderBottom: '1px solid #f5f5f5',
                          background: isOpen ? '#f7f7f2' : '#fff',
                        }}
                      >
                        {colorHex ? (
                          <div style={{ width: 12, height: 12, background: colorHex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 12, height: 12, border: '1px solid #ddd', flexShrink: 0 }} />
                        )}

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{variant.variante ?? variant.sku}</span>
                          <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace' }}>{variant.sku}</span>
                        </div>

                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#D93A35' }}>{fmt(variant.precio)}</span>
                          <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace' }} className="fr-peso">
                            <style>{`@media(max-width:400px){.fr-peso{display:none!important}}`}</style>
                            {variant.peso_kg}kg
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: isOpen ? '#D93A35' : '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {isOpen ? 'Close' : 'Edit'}
                          </span>
                        </div>
                      </div>

                      {/* SKU fungibles editor */}
                      {isOpen && (
                        <div style={{ borderBottom: '1px solid #eee', background: '#fafafa', padding: '12px 16px' }}>
                          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>
                            Recipe for <span style={{ fontFamily: 'monospace', color: '#555' }}>{variant.sku}</span>
                          </div>

                          {skuLoading ? (
                            <div style={{ fontSize: 11, color: '#aaa' }}>Loading…</div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                {skuItems.length === 0 && (
                                  <div style={{ fontSize: 11, color: '#aaa' }}>No materials assigned yet.</div>
                                )}
                                {skuItems.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                      value={item.fungible_id}
                                      onChange={e => updateLine(idx, 'fungible_id', e.target.value)}
                                      style={{ ...inputSt, flex: 1, minWidth: 100 }}
                                    >
                                      {fungibles.map(f => <option key={f.id} value={f.id}>{f.nombre} ({f.unidad})</option>)}
                                    </select>
                                    <input
                                      type="number" min="0" step="0.1"
                                      value={item.cantidad}
                                      onChange={e => updateLine(idx, 'cantidad', e.target.value)}
                                      placeholder="qty"
                                      style={{ ...inputSt, width: 70 }}
                                    />
                                    <span style={{ fontSize: 10, color: '#aaa', minWidth: 24 }}>{item.unidad}/u</span>
                                    <button
                                      onClick={() => removeLine(idx)}
                                      style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#D93A35', fontSize: 16, padding: '0 4px', minHeight: 'auto' }}
                                    >×</button>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {fungibles.length > 0 ? (
                                  <button onClick={addFungibleLine} className="btn-ghost" style={{ fontSize: 9 }}>+ Add material</button>
                                ) : (
                                  <span style={{ fontSize: 10, color: '#aaa' }}>Create materials first.</span>
                                )}
                                <button onClick={() => saveSku(variant.sku)} disabled={skuSaving} className="btn-primary" style={{ fontSize: 9 }}>
                                  {skuSaving ? 'Saving…' : 'Save recipe'}
                                </button>
                                {skuSaveOk && <span style={{ fontSize: 10, color: '#0DA265', fontWeight: 700 }}>✓ Saved</span>}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
