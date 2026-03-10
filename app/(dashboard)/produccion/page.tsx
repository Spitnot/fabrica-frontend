'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PedidoRef { id: string; status: string; cantidad: number; created_at: string; cliente: string }
interface SkuFungible { id: string; nombre: string; unidad: string; total: number }
interface StockItem {
  sku: string;
  nombre_producto: string;
  unidades: number;
  fungibles: SkuFungible[];
  pedidos: PedidoRef[];
}
interface FungibleTotal { id: string; nombre: string; unidad: string; total: number }

const STATUS_STYLES: Record<string, string> = {
  confirmado:  'text-[#0087B8] bg-blue-50 border-blue-200',
  produccion:  'text-[#b85e00] bg-orange-50 border-orange-200',
  listo_envio: 'text-[#876693] bg-purple-50 border-purple-200',
};
const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmed', produccion: 'In Production', listo_envio: 'Ready to Ship',
};

export default function ProduccionPage() {
  const [stock, setStock]           = useState<StockItem[]>([]);
  const [fungTotals, setFungTotals] = useState<FungibleTotal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/produccion/stock');
    const json = await res.json();
    setStock(json.data ?? []);
    setFungTotals(json.fungible_totals ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return stock;
    return stock.filter(i =>
      i.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [stock, search]);

  const totalUnidades = filtered.reduce((s, i) => s + i.unidades, 0);

  function exportCSV() {
    const rows = [
      ['SKU', 'Product', 'Units', ...fungTotals.map(f => `${f.nombre} (${f.unidad})`)],
      ...filtered.map(i => [
        i.sku, i.nombre_producto, i.unidades,
        ...fungTotals.map(f => i.fungibles.find(x => x.id === f.id)?.total ?? ''),
      ]),
      [],
      ['TOTALS', '', totalUnidades, ...fungTotals.map(f => f.total)],
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
              style={{ fontFamily: 'var(--font-alexandria)' }}>Production Stock</h1>
          <p className="text-xs text-gray-400 mt-0.5">Units pending production · fungible totals from active orders</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {fungTotals.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Fungible Totals</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fungTotals.map(f => (
              <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-gray-400 mb-1.5 truncate">{f.nombre}</div>
                <div className="text-xl font-black tracking-tight text-gray-900"
                     style={{ fontFamily: 'var(--font-alexandria)' }}>
                  {f.total.toLocaleString()}
                  <span className="text-xs font-normal text-gray-400 ml-1">{f.unidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-2">SKUs Pending</div>
          <div className="text-2xl font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{filtered.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-2">Total Units</div>
          <div className="text-2xl font-black text-[#0087B8]" style={{ fontFamily: 'var(--font-alexandria)' }}>{totalUnidades.toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU or product…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D93A35] transition-colors w-64" />
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
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">SKU</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Product</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Units</th>
                {fungTotals.map(f => (
                  <th key={f.id} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    {f.nombre} <span className="font-normal normal-case text-gray-300">({f.unidad})</span>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isOpen = expanded === item.sku;
                return (
                  <>
                    <tr key={item.sku}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : item.sku)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.nombre_producto}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>
                          {item.unidades.toLocaleString()}
                        </span>
                      </td>
                      {fungTotals.map(f => {
                        const match = item.fungibles.find(x => x.id === f.id);
                        return (
                          <td key={f.id} className="px-4 py-3 font-mono text-xs text-gray-600">
                            {match ? match.total.toLocaleString() : <span className="text-gray-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-gray-300">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${item.sku}-exp`} className="bg-gray-50/70 border-b border-gray-100">
                        <td colSpan={4 + fungTotals.length} className="px-6 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Orders</div>
                          <div className="space-y-1.5">
                            {item.pedidos.map(p => (
                              <div key={p.id} className="flex items-center gap-3">
                                <Link href={`/pedidos/${p.id}`} className="font-mono text-xs text-[#D93A35] hover:underline">
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
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={2} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Total</td>
                <td className="px-4 py-3 font-black text-sm text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>
                  {totalUnidades.toLocaleString()}
                </td>
                {fungTotals.map(f => (
                  <td key={f.id} className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                    {f.total.toLocaleString()} {f.unidad}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
