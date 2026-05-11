import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { TarifaCard } from './TarifaCard';

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

export default async function TarifasPage() {
  const [tarifas, counts] = await Promise.all([getTarifas(), getCustomerCountByTarifa()]);

  return (
    <div className="fr-page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="fr-label">Configuration</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Pricing Tiers</h1>
          <div className="fr-label" style={{ marginTop: 4 }}>{tarifas.length} tier{tarifas.length !== 1 ? 's' : ''} configured</div>
        </div>
        <Link href="/tarifas/nuevo">
          <button className="btn-primary">+ New Tier</button>
        </Link>
      </div>

      {tarifas.length === 0 ? (
        <div className="fr-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#111' }}>No pricing tiers found.</div>
          <div className="fr-label" style={{ marginTop: 8 }}>Run the SQL migration to create Retail and Wholesale tiers.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {tarifas.map((t: any) => (
            <TarifaCard key={t.id} tarifa={t} count={counts[t.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
