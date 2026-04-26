'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TARIFA_COLORS: Record<string, string> = { retail: '#0087B8', wholesale: '#876693' };

interface TarifaCardProps {
  tarifa: { id: string; nombre: string; descripcion: string | null; multiplicador: number; activo: boolean };
  count: number;
}

export function TarifaCard({ tarifa: t, count }: TarifaCardProps) {
  const color = TARIFA_COLORS[t.nombre.toLowerCase()] ?? '#555';
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (count > 0) {
      alert(`Cannot delete: ${count} active client${count !== 1 ? 's' : ''} assigned to this tier.`);
      return;
    }
    if (!confirm(`Delete tier "${t.nombre}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tarifas/${t.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json();
      alert(error ?? 'Failed to delete tier');
      setDeleting(false);
    }
  }

  return (
    <Link href={`/tarifas/${t.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="card"
        style={{ borderTop: `3px solid ${color}`, cursor: 'pointer', transition: 'transform 0.08s, box-shadow 0.08s', position: 'relative' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px,2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 2px 0 #111'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
            {t.nombre}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge" style={{ background: t.activo ? '#0DA265' : '#999', fontSize: 7 }}>
              {t.activo ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title={count > 0 ? `${count} client${count !== 1 ? 's' : ''} assigned` : 'Delete tier'}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 11,
                cursor: count > 0 ? 'not-allowed' : 'pointer',
                color: count > 0 ? '#ccc' : '#D93A35',
                lineHeight: 1,
                opacity: deleting ? 0.5 : 1,
              }}
            >
              {deleting ? '…' : '✕'}
            </button>
          </div>
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
