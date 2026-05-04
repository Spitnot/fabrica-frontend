'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TarifaPrecio { sku: string; precio: number; pack_size?: number | null; }
interface Tarifa {
  id: string; nombre: string; descripcion?: string; multiplicador: number; activo: boolean;
  hidden_products: string[]; minimum_order_value: number; pack_size: number;
  precios: TarifaPrecio[];
}
interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; shopify_product_id?: string; }

const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

export default function TarifaDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [tarifa, setTarifa]           = useState<Tarifa | null>(null);
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [savingMeta, setSavingMeta]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [search, setSearch]           = useState('');

  const [preciosEdit, setPreciosEdit]   = useState<Record<string, string>>({});
  const [packSizeEdit, setPackSizeEdit] = useState<Record<string, string>>({});

  const [meta, setMeta] = useState({
    nombre: '', descripcion: '', multiplicador: '',
    minimum_order_value: '0', pack_size: '1',
  });
  const [hiddenProducts, setHiddenProducts] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [tRes, pRes] = await Promise.all([fetch(`/api/tarifas/${id}`), fetch('/api/products')]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      if (!tRes.ok) { setError('Pricing tier not found'); setLoading(false); return; }
      setTarifa(tData);
      setProducts(pData.data ?? []);
      setMeta({
        nombre: tData.nombre, descripcion: tData.descripcion ?? '',
        multiplicador: String(tData.multiplicador),
        minimum_order_value: String(tData.minimum_order_value ?? 0),
        pack_size: String(tData.pack_size ?? 1),
      });
      setHiddenProducts(tData.hidden_products ?? []);
      const precioMap: Record<string, string> = {};
      const packMap:   Record<string, string> = {};
      (tData.precios ?? []).forEach((p: TarifaPrecio) => {
        precioMap[p.sku] = String(p.precio);
        if (p.pack_size != null) packMap[p.sku] = String(p.pack_size);
      });
      setPreciosEdit(precioMap);
      setPackSizeEdit(packMap);
      setLoading(false);
    }
    load();
  }, [id]);

  const productGroups = useMemo(() => {
    const filtered = search.length >= 2
      ? products.filter(p =>
          p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.variante ?? '').toLowerCase().includes(search.toLowerCase()))
      : products;
    const map = new Map<string, Product[]>();
    filtered.forEach(p => { const g = map.get(p.nombre_producto) ?? []; g.push(p); map.set(p.nombre_producto, g); });
    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes }));
  }, [products, search]);

  function setPrice(sku: string, value: string) { setPreciosEdit(prev => ({ ...prev, [sku]: value })); }
  function clearPrice(sku: string) { setPreciosEdit(prev => { const n = { ...prev }; delete n[sku]; return n; }); }
  function setPackSize(sku: string, value: string) { setPackSizeEdit(prev => ({ ...prev, [sku]: value })); }
  function clearPackSize(sku: string) { setPackSizeEdit(prev => { const n = { ...prev }; delete n[sku]; return n; }); }

  function effectivePrice(sku: string, shopifyPrice: number): number {
    const val = parseFloat(preciosEdit[sku] ?? '');
    if (!isNaN(val) && val > 0) return val;
    return shopifyPrice * parseFloat(meta.multiplicador || '1');
  }
  function effectivePackSize(sku: string): number {
    const val = parseInt(packSizeEdit[sku] ?? '');
    if (!isNaN(val) && val > 0) return val;
    return parseInt(meta.pack_size) || 1;
  }

  async function handleSaveMeta() {
    setSavingMeta(true); setError(''); setSuccess('');
    const res = await fetch(`/api/tarifas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: meta.nombre, descripcion: meta.descripcion || null,
        multiplicador: parseFloat(meta.multiplicador),
        minimum_order_value: parseFloat(meta.minimum_order_value) || 0,
        pack_size: parseInt(meta.pack_size) || 1,
        hidden_products: hiddenProducts,
      }),
    });
    setSavingMeta(false);
    if (!res.ok) { setError('Failed to save'); return; }
    setSuccess('Tier updated'); setTimeout(() => setSuccess(''), 3000);
  }

  async function handleSavePrecios() {
    setSaving(true); setError(''); setSuccess('');
    const allSkus = new Set([
      ...Object.keys(preciosEdit).filter(sku => parseFloat(preciosEdit[sku]) > 0),
      ...Object.keys(packSizeEdit).filter(sku => parseInt(packSizeEdit[sku]) > 0),
    ]);
    const precios = Array.from(allSkus).map(sku => {
      const precio   = parseFloat(preciosEdit[sku] ?? '');
      const packSize = parseInt(packSizeEdit[sku]  ?? '');
      return { sku, precio: isNaN(precio) || precio <= 0 ? 0 : precio, pack_size: isNaN(packSize) || packSize <= 0 ? null : packSize };
    }).filter(p => p.precio > 0 || p.pack_size != null);
    const res = await fetch(`/api/tarifas/${id}/precios`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precios }),
    });
    setSaving(false);
    if (!res.ok) { setError('Failed to save prices'); return; }
    setSuccess(`${precios.length} price${precios.length !== 1 ? 's' : ''} saved`);
    setTimeout(() => setSuccess(''), 3000);
  }

  if (loading) return <div style={{ padding: 32, fontSize: 12, color: '#111' }}>Loading…</div>;
  if (!tarifa) return (
    <div style={{ padding: 32 }}>
      <div style={{ fontSize: 12, color: '#D93A35' }}>{error || 'Pricing tier not found'}</div>
      <Link href="/tarifas" className="fr-label" style={{ color: '#D93A35', display: 'inline-block', marginTop: 8 }}>← Back</Link>
    </div>
  );

  const customPriceCount = Object.values(preciosEdit).filter(v => parseFloat(v) > 0).length;
  const customPackCount  = Object.values(packSizeEdit).filter(v => parseInt(v) > 0).length;

  const cellStyle = { padding: '10px 14px', borderBottom: '1px solid #111', fontSize: 12, color: '#111' };
  const headStyle = { padding: '8px 14px', borderBottom: '1px solid #111', background: '#F7F7F2', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#111', textAlign: 'left' as const };

  return (
    <div className="fr-page">
      <div>
        <Link href="/tarifas" className="fr-label" style={{ color: '#111', textDecoration: 'none' }}>← Back to Pricing Tiers</Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{tarifa.nombre}</h1>
        {tarifa.descripcion && <div className="fr-label" style={{ marginTop: 4 }}>{tarifa.descripcion}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* LEFT — price table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="fr-label" style={{ whiteSpace: 'nowrap' }}>Per-SKU Prices</span>
            <div style={{ flex: 1, height: 1, background: '#111' }} />
            <span className="fr-label">{customPriceCount} custom · {customPackCount} pack overrides · {products.length} total</span>
          </div>

          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, SKU or variant…" />

          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr>
                    {['Product / Variant', 'SKU', 'Shopify', 'Custom Price', 'Pack Size', 'Effective', ''].map(h => (
                      <th key={h} style={headStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productGroups.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...cellStyle, textAlign: 'center', padding: '40px 16px' }}>No products found</td></tr>
                  ) : productGroups.flatMap(group =>
                    group.variantes.map((v, vi) => {
                      const hasCustomPrice = !!preciosEdit[v.sku] && parseFloat(preciosEdit[v.sku]) > 0;
                      const hasCustomPack  = !!packSizeEdit[v.sku] && parseInt(packSizeEdit[v.sku]) > 0;
                      const effective      = effectivePrice(v.sku, v.precio_mayorista);
                      const effPack        = effectivePackSize(v.sku);
                      const productId      = group.nombre;
                      const isHidden       = hiddenProducts.includes(productId);
                      return (
                        <tr key={v.sku} style={{ opacity: isHidden ? 0.4 : 1 }}>
                          <td style={cellStyle}>
                            {vi === 0 && <div style={{ fontSize: 12, fontWeight: 700 }}>{group.nombre}</div>}
                            {v.variante && <div className="fr-label">{v.variante}</div>}
                          </td>
                          <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{v.sku}</td>
                          <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(v.precio_mayorista)}</td>
                          <td style={cellStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" step="0.01" min="0" value={preciosEdit[v.sku] ?? ''}
                                onChange={e => setPrice(v.sku, e.target.value)}
                                placeholder={fmt(v.precio_mayorista * parseFloat(meta.multiplicador || '1'))}
                                style={{ width: 88, fontSize: 11 }} />
                              {hasCustomPrice && (
                                <button onClick={() => clearPrice(v.sku)} title="Clear custom price"
                                  style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 2px', fontSize: 14, color: '#D93A35', minHeight: 'auto' }}>×</button>
                              )}
                            </div>
                          </td>
                          <td style={cellStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" step="1" min="1" value={packSizeEdit[v.sku] ?? ''}
                                onChange={e => setPackSize(v.sku, e.target.value)}
                                placeholder={String(parseInt(meta.pack_size) || 1)}
                                style={{ width: 64, fontSize: 11, border: hasCustomPack ? '1px solid #D93A35' : '1px solid #111' }} />
                              {hasCustomPack && (
                                <button onClick={() => clearPackSize(v.sku)} title="Use tier default"
                                  style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 2px', fontSize: 14, color: '#D93A35', minHeight: 'auto' }}>×</button>
                              )}
                            </div>
                          </td>
                          <td style={cellStyle}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: hasCustomPrice ? '#D93A35' : '#111' }}>
                              {fmt(effective)}
                            </span>
                            {hasCustomPrice && <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#D93A35', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>custom</span>}
                            <div className="fr-label">×{effPack}{hasCustomPack ? '' : ' (tier)'}</div>
                          </td>
                          {vi === 0 ? (
                            <td style={cellStyle} rowSpan={group.variantes.length}>
                              <button title={isHidden ? 'Show product' : 'Hide product'}
                                onClick={() => setHiddenProducts(p => isHidden ? p.filter(x => x !== productId) : [...p, productId])}
                                style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 4, minHeight: 'auto' }}>
                                {isHidden ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D93A35" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                  </svg>
                                )}
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleSavePrecios} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Prices & Pack Sizes'}
            </button>
            {success && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#0DA265' }}>{success}</span>}
            {error   && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>{error}</span>}
          </div>
        </div>

        {/* RIGHT — tarifa meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fr-card">
            <div className="fr-section-head">Tier Settings</div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Name', key: 'nombre', type: 'text', hint: '' },
                { label: 'Description', key: 'descripcion', type: 'text', hint: '' },
                { label: 'Default Multiplier', key: 'multiplicador', type: 'number', hint: 'Applied to Shopify price when no custom price. e.g. 0.65 = 65% of retail.' },
                { label: 'Minimum Order Value (€)', key: 'minimum_order_value', type: 'number', hint: '0 = no minimum.' },
                { label: 'Default Pack Size', key: 'pack_size', type: 'number', hint: 'Fallback for products without per-SKU pack size.' },
              ].map(({ label, key, type, hint }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="fr-label">{label}</label>
                  <input type={type} step={type === 'number' ? (key === 'pack_size' ? '1' : '0.01') : undefined}
                    value={(meta as any)[key]}
                    onChange={e => setMeta(p => ({ ...p, [key]: e.target.value }))} />
                  {hint && <p style={{ fontSize: 10, color: '#111' }}>{hint}</p>}
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="fr-label">
                  Hidden Products{hiddenProducts.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', color: '#D93A35', marginLeft: 6 }}>({hiddenProducts.length})</span>}
                </label>
                <p style={{ fontSize: 10, color: '#111' }}>Toggle visibility per product using the eye button in the table.</p>
                {hiddenProducts.length > 0 && (
                  <div style={{ border: '1px solid #111', padding: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 112, overflowY: 'auto' }}>
                    {hiddenProducts.map(pid => (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pid}</span>
                        <button onClick={() => setHiddenProducts(p => p.filter(x => x !== pid))}
                          style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 2px', fontSize: 14, color: '#D93A35', flexShrink: 0, minHeight: 'auto' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleSaveMeta} disabled={savingMeta} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {savingMeta ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>

          <div className="fr-card" style={{ padding: 16 }}>
            <div className="fr-label" style={{ marginBottom: 8 }}>Price Logic</div>
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>1. Custom price per SKU → use it</div>
              <div>2. Otherwise → Shopify × <span style={{ fontFamily: 'var(--font-mono)' }}>{meta.multiplicador || '1'}</span></div>
              <div>3. Then apply client personal discount</div>
            </div>
            <hr style={{ margin: '10px 0' }} />
            <div className="fr-label" style={{ marginBottom: 8 }}>Pack Size Logic</div>
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>1. Per-SKU override → use it</div>
              <div>2. Otherwise → tier default (<span style={{ fontFamily: 'var(--font-mono)' }}>{meta.pack_size || '1'}</span>)</div>
            </div>
            <hr style={{ margin: '10px 0' }} />
            <div style={{ fontSize: 11 }}>Min. order: <span style={{ fontFamily: 'var(--font-mono)' }}>{parseFloat(meta.minimum_order_value) > 0 ? `€${meta.minimum_order_value}` : 'none'}</span></div>
            <div style={{ fontSize: 11 }}>Hidden: <span style={{ fontFamily: 'var(--font-mono)' }}>{hiddenProducts.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
