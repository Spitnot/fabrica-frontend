'use client';

import Link from 'next/link';

const TARIFA_COLORS: Record<string, string> = { retail: '#0087B8', wholesale: '#876693' };

interface TarifaCardProps {
  tarifa: { id: string; nombre: string; descripcion: string | null; multiplicador: number; activo: boolean };
  count: number;
}

export function TarifaCard({ tarifa: t, count }: TarifaCardProps) {
  const color = TARIFA_COLORS[t.nombre.toLowerCase()] ?? '#555';
  return (
    <Link href={`/tarifas/${t.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="card"
        style={{ borderTop: `3px solid ${color}`, cursor: 'pointer', transition: 'transform 0.08s, box-shadow 0.08s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px,2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 2px 0 #111'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
            {t.nombre}
          </div>
          <span className="badge" style={{ background: t.activo ? '#0DA265' : '#999', fontSize: 7 }}>
            {t.activo ? 'Active' : 'Inactive'}
          </span>
        </div>
        {t.descripcion && (
          <div style={{ fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.5 }}>{t.descripcion}</div>
        )}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#aaa' }}>Multiplier</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#111' }}>{(t.multiplicador * 100).toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#aaa' }}>Clients</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, color }}>{count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
