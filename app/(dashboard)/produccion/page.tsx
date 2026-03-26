'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PedidoRef { id: string; status: string; cantidad: number; created_at: string; cliente: string }
interface SkuFungible { id: string; nombre: string; unidad: string; total: number }
interface StockItem { sku: string; nombre_producto: string; unidades: number; fungibles: SkuFungible[]; pedidos: PedidoRef[] }
interface FungibleTotal { id: string; nombre: string; unidad: string; total: number }

const STATUS_COLORS: Record<string, string> = {
  confirmado: '#0087B8', produccion: '#E6883E', listo_envio: '#876693',
};
const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmed', produccion: 'In Production', listo_envio: 'Ready to Ship',
};
const SKU_COLORS = ['#D93A35','#E6883E','#0DA265','#0087B8','#876693','#111','#b8a800'];

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
  const maxUnidades = Math.max(...filtered.map(s => s.unidades), 1);

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
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Production Stock</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Units pending · fungible totals from active orders</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn-ghost">↻ Refresh</button>
          <button onClick={exportCSV} className="btn-ghost">↓ Export CSV</button>
        </div>
      </div>

      {/* Fungible totals */}
      {fungTotals.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>Materials needed</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {fungTotals.map(f => (
              <div key={f.id} className="card" style={{ borderLeft: '3px solid #E6883E' }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#E6883E', lineHeight: 1 }}>
                  {f.total.toLocaleString()}
                  <span style={{ fontSize: 9, fontWeight: 400, color: '#aaa', marginLeft: 3 }}>{f.unidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '3px solid #D93A35' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>SKUs Pending</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#D93A35', lineHeight: 1 }}>{filtered.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid #0087B8' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Total Units</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0087B8', lineHeight: 1 }}>{totalUnidades.toLocaleString()}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU or product…"
          style={{ maxWidth: 280, width: '100%', fontFamily: 'var(--font-main)', fontSize: 12, border: '1px solid #111', borderRadius: 0, padding: '7px 10px', background: '#fff', color: '#111', outline: 'none' }}
        />
      </div>

      {/* SKU list — expandable cards, NO table */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#aaa' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#aaa' }}>
          {search ? 'No SKUs match the search.' : 'No pending production.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((item, idx) => {
            const isOpen = expanded === item.sku;
            const color = SKU_COLORS[idx % SKU_COLORS.length];
            const barPct = Math.round((item.unidades / maxUnidades) * 100);

            return (
              <div key={item.sku} className="card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Main row — clickable */}
                <div
                  onClick={() => setExpanded(isOpen ? null : item.sku)}
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ width: 10, height: 10, background: color, border: '1px solid #111', flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nombre_producto}
                    </div>
                    <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace', marginTop: 1 }}>{item.sku}</div>
                  </div>

                  {/* Fungible quick summary */}
                  {item.fungibles.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} className="fr-fung-summary">
                      <style>{`@media(max-width:480px){.fr-fung-summary{display:none!important}}`}</style>
                      {item.fungibles.slice(0, 2).map(f => (
                        <div key={f.id} style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace' }}>
                          <span style={{ fontWeight: 700, color: '#E6883E' }}>{f.total}</span>{f.unidad}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bar */}
                  <div style={{ width: 80, flexShrink: 0 }} className="fr-bar">
                    <style>{`@media(max-width:360px){.fr-bar{display:none!important}}`}</style>
                    <div style={{ height: 3, background: '#eee' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: color }} />
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 44 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{item.unidades}</div>
                    <div style={{ fontSize: 7, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>units</div>
                  </div>

                  <div style={{ fontSize: 12, color: '#ccc', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>↓</div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #eee', background: '#fafafa' }}>

                    {/* Fungibles */}
                    {item.fungibles.length > 0 && (
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>Materials</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {item.fungibles.map(f => (
                            <div key={f.id} style={{ background: '#fff', border: '1px solid #eee', padding: '6px 10px' }}>
                              <div style={{ fontSize: 8, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.nombre}</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: '#E6883E' }}>
                                {f.total % 1 === 0 ? f.total : f.total.toFixed(1)}
                                <span style={{ fontSize: 9, fontWeight: 400, color: '#aaa', marginLeft: 2 }}>{f.unidad}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Orders */}
                    {item.pedidos.length > 0 && (
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>Orders</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {item.pedidos.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', border: '1px solid #eee', flexWrap: 'wrap' }}>
                              <Link href={`/pedidos/${p.id}`} style={{ fontSize: 10, fontWeight: 700, color: '#D93A35', fontFamily: 'monospace', textDecoration: 'none' }}>
                                #{p.id.slice(0, 8).toUpperCase()}
                              </Link>
                              <span className="badge" style={{ background: STATUS_COLORS[p.status] ?? '#999', fontSize: 7 }}>
                                {STATUS_LABELS[p.status] ?? p.status}
                              </span>
                              <div style={{ fontSize: 11, color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente}</div>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#111', flexShrink: 0 }}>{p.cantidad}u</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Totals footer */}
          <div className="card" style={{ background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666' }}>Totals</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 9, color: '#666', marginRight: 6 }}>Units</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{totalUnidades.toLocaleString()}</span>
              </div>
              {fungTotals.map(f => (
                <div key={f.id}>
                  <span style={{ fontSize: 9, color: '#666', marginRight: 4 }}>{f.nombre}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#E6883E' }}>{f.total.toLocaleString()}{f.unidad}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
