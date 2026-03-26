import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getTarifas() {
  const { data } = await supabaseAdmin.from('tarifas').select('id, nombre, descripcion, multiplicador, activo').order('nombre');
  return data ?? [];
}

async function getCustomerCountByTarifa(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from('customers').select('tarifa_id').eq('estado', 'active');
  const counts: Record<string, number> = {};
  (data ?? []).forEach((c: any) => { if (c.tarifa_id) counts[c.tarifa_id] = (counts[c.tarifa_id] ?? 0) + 1; });
  return counts;
}

const TARIFA_COLORS: Record<string, string> = { retail: '#0087B8', wholesale: '#876693' };

export default async function TarifasPage() {
  const [tarifas, counts] = await Promise.all([getTarifas(), getCustomerCountByTarifa()]);

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Pricing Tiers</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{tarifas.length} tier{tarifas.length !== 1 ? 's' : ''} configured</div>
        </div>
        <Link href="/tarifas/nuevo">
          <button className="btn-primary">+ New Tier</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {tarifas.map((t: any) => {
          const color = TARIFA_COLORS[t.nombre.toLowerCase()] ?? '#555';
          return (
            <Link key={t.id} href={`/tarifas/${t.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ borderTop: `3px solid ${color}`, cursor: 'pointer', transition: 'transform 0.08s, box-shadow 0.08s' }}
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
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color }}>{counts[t.id] ?? 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {tarifas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 16px', fontSize: 12, color: '#aaa' }}>
          No pricing tiers found.<br />
          <span style={{ fontSize: 10 }}>Run the SQL migration to create Retail and Wholesale tiers.</span>
        </div>
      )}
    </div>
  );
}
