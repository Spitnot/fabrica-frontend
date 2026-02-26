'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TarifaPrecio { sku: string; precio: number; }
interface Tarifa { id: string; nombre: string; descripcion?: string; multiplicador: number; activo: boolean; precios: TarifaPrecio[]; }
interface Product { sku: string; nombre_producto: string; variante?: string; precio_mayorista: number; }

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function TarifaDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [tarifa, setTarifa]       = useState<Tarifa | null>(null);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [search, setSearch]       = useState('');

  // Mapa editable: sku → precio (string para el input)
  const [preciosEdit, setPreciosEdit] = useState<Record<string, string>>({});

  // Meta edición
  const [meta, setMeta] = useState({ nombre: '', descripcion: '', multiplicador: '' });

  useEffect(() => {
    async function load() {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/tarifas/${id}`),
        fetch('/api/products'),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();

      if (!tRes.ok) { setError('Tarifa no encontrada'); setLoading(false); return; }

      setTarifa(tData);
      setProducts(pData.data ?? []);
      setMeta({
        nombre:       tData.nombre,
        descripcion:  tData.descripcion ?? '',
        multiplicador: String(tData.multiplicador),
      });

      // Inicializar mapa de precios
      const map: Record<string, string> = {};
      (tData.precios ?? []).forEach((p: TarifaPrecio) => { map[p.sku] = String(p.precio); });
      setPreciosEdit(map);

      setLoading(false);
    }
    load();
  }, [id]);

  // Agrupamos por producto para la tabla
  const productGroups = useMemo(() => {
    const filtered = search.length >= 2
      ? products.filter(p =>
          p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.variante ?? '').toLowerCase().includes(search.toLowerCase()))
      : products;

    const map = new Map<string, Product[]>();
    filtered.forEach(p => {
      const g = map.get(p.nombre_producto) ?? [];
      g.push(p);
      map.set(p.nombre_producto, g);
    });
    return Array.from(map.entries()).map(([nombre, variantes]) => ({ nombre, variantes }));
  }, [products, search]);

  function setPrice(sku: string, value: string) {
    setPreciosEdit(prev => ({ ...prev, [sku]: value }));
  }

  function clearPrice(sku: string) {
    setPreciosEdit(prev => { const n = { ...prev }; delete n[sku]; return n; });
  }

  function effectivePrice(sku: string, shopifyPrice: number): number {
    const val = parseFloat(preciosEdit[sku] ?? '');
    if (!isNaN(val) && val > 0) return val;
    return shopifyPrice * parseFloat(meta.multiplicador || '1');
  }

  async function handleSaveMeta() {
    setSavingMeta(true); setError(''); setSuccess('');
    const res = await fetch(`/api/tarifas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: meta.nombre,
        descripcion: meta.descripcion || null,
        multiplicador: parseFloat(meta.multiplicador),
      }),
    });
    setSavingMeta(false);
    if (!res.ok) { setError('Error al guardar'); return; }
    setSuccess('Tarifa actualizada');
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handleSavePrecios() {
    setSaving(true); setError(''); setSuccess('');
    const precios = Object.entries(preciosEdit)
      .map(([sku, val]) => ({ sku, precio: parseFloat(val) }))
      .filter(p => !isNaN(p.precio) && p.precio > 0);

    const res = await fetch(`/api/tarifas/${id}/precios`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precios }),
    });
    setSaving(false);
    if (!res.ok) { setError('Error al guardar precios'); return; }
    setSuccess(`${precios.length} precios guardados`);
    setTimeout(() => setSuccess(''), 3000);
  }

  if (loading) return (
    <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
      <div className="w-4 h-4 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
      Loading…
    </div>
  );

  if (!tarifa) return (
    <div className="p-7">
      <div className="text-sm text-[#D93A35]">{error || 'Tarifa no encontrada'}</div>
      <Link href="/tarifas" className="text-xs text-[#D93A35] mt-2 inline-block">← Back</Link>
    </div>
  );

  const customPriceCount = Object.values(preciosEdit).filter(v => parseFloat(v) > 0).length;

  const inputCls = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7">
      <Link href="/tarifas" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        ← Back to Pricing Tiers
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-xl bg-[#D93A35]/10 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D93A35" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>{tarifa.nombre}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tarifa.descripcion ?? 'Sin descripción'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* LEFT — price table */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">Per-SKU Prices</span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400">{customPriceCount} custom · {products.length} total</span>
          </div>

          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products, SKU or variant…"
            className={`w-full mb-4 ${inputCls}`} />

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Product / Variant', 'SKU', 'Shopify', 'Custom Price', 'Effective'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productGroups.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No products found</td></tr>
                ) : (
                  productGroups.flatMap(group =>
                    group.variantes.map((v, vi) => {
                      const hasCustom = !!preciosEdit[v.sku] && parseFloat(preciosEdit[v.sku]) > 0;
                      const effective = effectivePrice(v.sku, v.precio_mayorista);
                      return (
                        <tr key={v.sku} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5">
                            {vi === 0 && <div className="text-xs font-semibold text-gray-700">{group.nombre}</div>}
                            {v.variante && <div className="text-[11px] text-gray-400">{v.variante}</div>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{v.sku}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{fmt(v.precio_mayorista)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={preciosEdit[v.sku] ?? ''}
                                onChange={e => setPrice(v.sku, e.target.value)}
                                placeholder={fmt(v.precio_mayorista * parseFloat(meta.multiplicador || '1'))}
                                className="w-24 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs font-mono text-gray-900 focus:border-[#D93A35] outline-none"
                              />
                              {hasCustom && (
                                <button onClick={() => clearPrice(v.sku)} title="Clear custom price"
                                  className="text-gray-300 hover:text-[#D93A35] transition-colors text-sm leading-none">×</button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`font-mono text-xs font-bold ${hasCustom ? 'text-[#D93A35]' : 'text-gray-500'}`}>
                              {fmt(effective)}
                            </span>
                            {hasCustom && (
                              <span className="ml-1.5 text-[9px] text-[#D93A35] font-bold uppercase tracking-wide">custom</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSavePrecios} disabled={saving}
              className="px-5 py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : `Save Prices (${customPriceCount})`}
            </button>
            {success && <span className="text-xs text-[#0DA265] font-semibold">{success}</span>}
            {error   && <span className="text-xs text-[#D93A35]">{error}</span>}
          </div>
        </div>

        {/* RIGHT — tarifa meta */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Tier Settings</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Name</label>
                <input value={meta.nombre} onChange={e => setMeta(p => ({ ...p, nombre: e.target.value }))}
                  className={`w-full ${inputCls}`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Description</label>
                <input value={meta.descripcion} onChange={e => setMeta(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Optional" className={`w-full ${inputCls}`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                  Default Multiplier
                </label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0" max="10"
                    value={meta.multiplicador}
                    onChange={e => setMeta(p => ({ ...p, multiplicador: e.target.value }))}
                    className={`w-full ${inputCls}`}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Applied to Shopify price when no custom price is set.<br />
                  e.g. 0.65 = 65% of retail · 1.0 = full price
                </p>
              </div>
              <button onClick={handleSaveMeta} disabled={savingMeta}
                className="w-full py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
                {savingMeta ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-2">
            <div className="font-bold text-gray-700 text-[11px] uppercase tracking-wide">Price Logic</div>
            <div>1. If a <strong>custom price</strong> is set for a SKU → use it</div>
            <div>2. Otherwise → <span className="font-mono">Shopify price × {meta.multiplicador || '1'}</span></div>
            <div>3. Then apply the client's <strong>personal discount</strong> on top</div>
          </div>
        </div>
      </div>
    </div>
  );
}
