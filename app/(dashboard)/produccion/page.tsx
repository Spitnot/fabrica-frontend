// app/(dashboard)/produccion/page.tsx
// Client component — fetch, filter, expand state, CSV export logic preserved 1:1.
// JSX restructured to match Foundry mockup: dark hero, fungible KPIs with
// Alexandria 56, dark-headed expandable SKU rows.

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader, FR } from '@/components/fr/Atoms';
import { StatusChip, FRStatus } from '@/components/fr/StatusChip';

interface PedidoRef { id: string; status: string; cantidad: number; created_at: string; cliente: string }
interface SkuFungible { id: string; nombre: string; unidad: string; total: number }
interface StockItem { sku: string; nombre_producto: string; unidades: number; fungibles: SkuFungible[]; pedidos: PedidoRef[] }
interface FungibleTotal { id: string; nombre: string; unidad: string; total: number }

const monoLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#111',
};

const sectionHeader: React.CSSProperties = {
  padding: '12px 16px', background: '#111', color: '#fff',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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
    <div className="fr-page">

      <PageHeader
        eyebrow="● PRODUCTION FLOOR / LIVE"
        title="STOCK"
        count="UNITS PENDING · MATERIALS FROM ACTIVE ORDERS"
        actions={<>
          <button onClick={load} className="btn-ghost">↻ REFRESH</button>
          <button onClick={exportCSV} className="btn-ghost">↓ CSV</button>
        </>}
      />

      {/* Top KPI row: SKUs / Units */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{ background: '#111', color: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...monoLabel, color: FR.yellow }}>SKUS PENDING</div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
            {filtered.length}
          </div>
        </div>
        <div style={{ background: '#fff', border: 'var(--border-dash)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={monoLabel}>TOTAL UNITS</div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
            {totalUnidades.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Fungible totals */}
      {fungTotals.length > 0 && (
        <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
          <div style={sectionHeader}>
            <span>▲ MATERIALS NEEDED</span>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.yellow }}>{fungTotals.length} TYPES</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {fungTotals.map((f, i) => (
              <div key={f.id} style={{
                padding: '16px 18px',
                borderRight: 'var(--border-light)',
                borderBottom: i >= fungTotals.length - (fungTotals.length % (Math.floor(1280/140)) || 1) ? 'none' : 'var(--border-light)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={monoLabel}>{f.nombre.toUpperCase()}</div>
                <div style={{
                  fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                  fontWeight: 900, fontSize: 32, lineHeight: 1, letterSpacing: '-0.04em',
                  color: '#111', fontVariantNumeric: 'tabular-nums',
                }}>
                  {f.total.toLocaleString()}
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 500, color: '#111', marginLeft: 4 }}>{f.unidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH SKU OR PRODUCT…"
          style={{
            maxWidth: 320, width: '100%',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
            border: 'var(--border-dash)', borderRadius: 0,
            padding: '10px 14px', background: '#fff', color: '#111', outline: 'none',
          }}
        />
      </div>

      {/* SKU expandable rows */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 12, color: '#111' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 12, color: '#111' }}>
          {search ? 'No SKUs match the search.' : 'No pending production.'}
        </div>
      ) : (
        <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
          <div style={sectionHeader}>
            <span>▣ SKU QUEUE</span>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.yellow }}>{filtered.length} ITEMS</span>
          </div>
          {filtered.map((item, idx) => {
            const isOpen = expanded === item.sku;
            const barPct = Math.round((item.unidades / maxUnidades) * 100);

            return (
              <div key={item.sku} style={{ borderBottom: idx < filtered.length - 1 ? 'var(--border-light)' : 'none' }}>

                {/* Main row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : item.sku)}
                  style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: isOpen ? '#f6efdf' : 'transparent' }}
                >
                  {/* Index */}
                  <div style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 10, color: '#111', fontWeight: 700,
                    width: 24, flexShrink: 0,
                  }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nombre_producto}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#111', marginTop: 2 }}>
                      {item.sku}
                    </div>
                  </div>

                  {/* Bar — desktop only */}
                  <div className="fr-bar" style={{ width: 120, flexShrink: 0 }}>
                    <style>{`@media(max-width:560px){.fr-bar{display:none!important}}`}</style>
                    <div style={{ height: 4, background: 'rgba(17,17,17,0.12)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${barPct}%`, background: '#111' }} />
                    </div>
                    <div style={{ ...monoLabel, marginTop: 4, fontSize: 8 }}>{barPct}%</div>
                  </div>

                  {/* Quantity */}
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
                    <div style={{
                      fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                      fontWeight: 900, fontSize: 32, lineHeight: 1,
                      letterSpacing: '-0.04em', color: '#111',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {item.unidades.toLocaleString()}
                    </div>
                    <div style={{ ...monoLabel, marginTop: 2 }}>UNITS</div>
                  </div>

                  {/* Caret */}
                  <div style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 14, color: '#111',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s', flexShrink: 0,
                  }}>↓</div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: 'var(--border-dash)', background: '#111', color: '#fff' }}>

                    {/* Fungibles */}
                    {item.fungibles.length > 0 && (
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #333' }}>
                        <div style={{ ...monoLabel, color: FR.yellow, marginBottom: 10 }}>MATERIALS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                          {item.fungibles.map(f => (
                            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{f.nombre}</div>
                              <div style={{
                                fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                                fontWeight: 900, fontSize: 22, lineHeight: 1,
                                letterSpacing: '-0.04em', color: FR.yellow,
                              }}>
                                {f.total % 1 === 0 ? f.total : f.total.toFixed(1)}
                                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 500, color: '#aaa', marginLeft: 3 }}>{f.unidad}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Orders */}
                    {item.pedidos.length > 0 && (
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ ...monoLabel, color: FR.yellow, marginBottom: 10 }}>ORDERS · {item.pedidos.length}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {item.pedidos.map(p => (
                            <Link
                              key={p.id}
                              href={`/pedidos/${p.id}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                                padding: '10px 12px', background: '#1a1a1a', border: '1px solid #333',
                                color: '#fff', textDecoration: 'none',
                              }}
                            >
                              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: FR.red, fontWeight: 700 }}>
                                #{p.id.slice(0, 8).toUpperCase()}
                              </span>
                              <StatusChip status={p.status as FRStatus} size="sm" />
                              <div style={{ fontSize: 12, color: '#ddd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente}</div>
                              <div style={{
                                fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                                fontWeight: 900, fontSize: 18, color: FR.yellow,
                                letterSpacing: '-0.03em',
                              }}>
                                {p.cantidad}<span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 500, color: '#111' }}>u</span>
                              </div>
                            </Link>
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
          <div style={{ background: '#111', color: '#fff', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...monoLabel, color: '#aaa' }}>TOTALS</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...monoLabel, color: '#aaa' }}>UNITS</span>
                <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.04em' }}>{totalUnidades.toLocaleString()}</span>
              </div>
              {fungTotals.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ ...monoLabel, color: '#aaa' }}>{f.nombre.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 22, color: FR.yellow, letterSpacing: '-0.04em' }}>
                    {f.total.toLocaleString()}<span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 500, color: '#888' }}>{f.unidad}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
