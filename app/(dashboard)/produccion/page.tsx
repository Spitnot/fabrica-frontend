'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PedidoRef {
  id: string;
  status: string;
  cantidad: number;
  created_at: string;
  cliente: string;
}

interface StockItem {
  sku: string;
  nombre_producto: string;
  unidades: number;
  volume_ml: number;
  alert_threshold_liters: number;
  litros_totales: number;
  alerta: boolean;
  pedidos: PedidoRef[];
}

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmed', produccion: 'In Production', listo_envio: 'Ready to Ship',
};
const STATUS_STYLES: Record<string, string> = {
  confirmado:  'text-[#0087B8] bg-blue-50 border-blue-200',
  produccion:  'text-[#b85e00] bg-orange-50 border-orange-200',
  listo_envio: 'text-[#876693] bg-purple-50 border-purple-200',
};

const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 outline-none focus:border-[#D93A35] transition-colors bg-white';

export default function ProduccionPage() {
  const [stock, setStock]       = useState<StockItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState<'all' | 'alerta'>('all');
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState<Record<string, { volume_ml: string; alert_threshold_liters: string }>>({});
  const [saving, setSaving]     = useState<string | null>(null);
  const [saveOk, setSaveOk]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/produccion/stock');
    const json = await res.json();
    setStock(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let s = stock;
    if (filter === 'alerta') s = s.filter(i => i.alerta);
    if (search) s = s.filter(i =>
      i.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
    );
    return s;
  }, [stock, filter, search]);

  const totalUnidades = filtered.reduce((s, i) => s + i.unidades, 0);
  const totalLitros   = filtered.reduce((s, i) => s + i.litros_totales, 0);
  const alertCount    = stock.filter(i => i.alerta).length;

  function getEdit(item: StockItem) {
    return editing[item.sku] ?? {
      volume_ml:              String(item.volume_ml || ''),
      alert_threshold_liters: String(item.alert_threshold_liters || '10'),
    };
  }

  async function saveMeta(item: StockItem) {
    const e = getEdit(item);
    setSaving(item.sku);
    await fetch('/api/produccion/meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku:                    item.sku,
        nombre_producto:        item.nombre_producto,
        volume_ml:              parseFloat(e.volume_ml) || 0,
        alert_threshold_liters: parseFloat(e.alert_threshold_liters) || 10,
      }),
    });
    setSaving(null);
    setSaveOk(item.sku);
    setTimeout(() => setSaveOk(null), 2000);
    load();
  }

  function exportCSV() {
    const rows = [
      ['SKU', 'Product', 'Units', 'Volume (ml)', 'Total Liters', 'Alert'],
      ...filtered.map(i => [i.sku, i.nombre_producto, i.unidades, i.volume_ml, i.litros_totales, i.alerta ? 'YES' : '']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `stock-produccion-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="p-6 md:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>
            Production Stock
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Units pending production from active orders</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'SKUs Pending', value: filtered.length,               color: '#D93A35' },
          { label: 'Total Units',  value: totalUnidades.toLocaleString(), color: '#0087B8' },
          { label: 'Total Liters', value: `${totalLitros.toFixed(1)} L`, color: '#b85e00' },
          { label: 'Alerts',       value: alertCount,                     color: alertCount > 0 ? '#D93A35' : '#0DA265' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-2">{c.label}</div>
            <div className="text-2xl font-black tracking-tight" style={{ color: c.color, fontFamily: 'var(--font-alexandria)' }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU or product…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D93A35] transition-colors w-64" />
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['all', 'alerta'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${filter === f ? 'bg-[#D93A35] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f === 'all' ? 'All' : `⚠ Alerts (${alertCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">No pending stock</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['SKU', 'Product', 'Units', 'Vol/unit', 'Total Liters', 'Threshold', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isOpen = expanded === item.sku;
                const e = getEdit(item);
                const litrosBar = item.volume_ml > 0
                  ? Math.min(100, (item.litros_totales / item.alert_threshold_liters) * 100)
                  : 0;

                return (
                  <>
                    <tr key={item.sku}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${item.alerta ? 'bg-red-50/40' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : item.sku)}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{item.sku}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900">{item.nombre_producto}</span>
                        {item.alerta && (
                          <span className="ml-2 text-[10px] font-bold text-[#D93A35] bg-red-50 border border-red-200 rounded px-1.5 py-0.5">⚠ ALERT</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>
                          {item.unidades.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {item.volume_ml > 0 ? `${item.volume_ml} ml` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {item.volume_ml > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${item.alerta ? 'text-[#D93A35]' : 'text-gray-900'}`}>
                              {item.litros_totales} L
                            </span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${item.alerta ? 'bg-[#D93A35]' : 'bg-[#0087B8]'}`}
                                style={{ width: `${litrosBar}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {item.volume_ml > 0 ? `${item.alert_threshold_liters} L` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${item.sku}-expanded`} className="bg-gray-50/70 border-b border-gray-100">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Orders</div>
                              <div className="space-y-1.5">
                                {item.pedidos.map(p => (
                                  <div key={p.id} className="flex items-center gap-3">
                                    <Link href={`/pedidos/${p.id}`}
                                      className="font-mono text-xs text-[#D93A35] hover:underline">
                                      #{p.id.slice(0, 8)}
                                    </Link>
                                    <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${STATUS_STYLES[p.status] ?? 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                                      {STATUS_LABELS[p.status] ?? p.status}
                                    </span>
                                    <span className="text-xs text-gray-500">{p.cliente}</span>
                                    <span className="ml-auto font-mono text-xs font-bold text-gray-900">×{p.cantidad}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Material Config</div>
                              <div className="flex items-end gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-gray-400">Volume per unit (ml)</label>
                                  <input type="number" min="0" step="0.1"
                                    value={e.volume_ml}
                                    onChange={ev => setEditing(prev => ({ ...prev, [item.sku]: { ...getEdit(item), volume_ml: ev.target.value } }))}
                                    className={inputCls} style={{ width: 100 }} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-gray-400">Alert threshold (L)</label>
                                  <input type="number" min="0" step="1"
                                    value={e.alert_threshold_liters}
                                    onChange={ev => setEditing(prev => ({ ...prev, [item.sku]: { ...getEdit(item), alert_threshold_liters: ev.target.value } }))}
                                    className={inputCls} style={{ width: 100 }} />
                                </div>
                                <button onClick={() => saveMeta(item)} disabled={saving === item.sku}
                                  className="px-3 py-1.5 bg-[#D93A35] text-white text-xs font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                                  {saving === item.sku ? 'Saving…' : 'Save'}
                                </button>
                                {saveOk === item.sku && <span className="text-xs text-[#0DA265] font-semibold">Saved ✓</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
