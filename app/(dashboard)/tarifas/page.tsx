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
        {tarifas.map((t: any) => (
          <TarifaCard key={t.id} tarifa={t} count={counts[t.id] ?? 0} />
        ))}
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
