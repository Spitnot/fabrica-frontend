import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';


export const dynamic = 'force-dynamic';

async function getTarifas() {
  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('id, nombre, descripcion, multiplicador, activo')
    .order('nombre');
  if (error) console.error('[tarifas]', error.message);
  return data ?? [];
}

async function getCustomerCountByTarifa(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('customers')
    .select('tarifa_id')
    .eq('estado', 'active');
  const counts: Record<string, number> = {};
  (data ?? []).forEach(c => {
    if (c.tarifa_id) counts[c.tarifa_id] = (counts[c.tarifa_id] ?? 0) + 1;
  });
  return counts;
}

export default async function TarifasPage() {
  const [tarifas, counts] = await Promise.all([getTarifas(), getCustomerCountByTarifa()]);

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Pricing Tiers</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tarifas.length} tier{tarifas.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Link href="/tarifas/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
          + New Tier
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tarifas.map((t) => (
          <Link key={t.id} href={`/tarifas/${t.id}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#D93A35]/40 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#D93A35]/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D93A35" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                t.activo
                  ? 'text-[#0DA265] bg-green-50 border-green-200'
                  : 'text-gray-400 bg-gray-100 border-gray-200'
              }`}>{t.activo ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="mb-1">
              <h2 className="text-sm font-black tracking-wider uppercase text-gray-900 group-hover:text-[#D93A35] transition-colors"
                  style={{ fontFamily: 'var(--font-alexandria)' }}>{t.nombre}</h2>
              {t.descripcion && <p className="text-xs text-gray-400 mt-0.5">{t.descripcion}</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
              <span className="text-gray-400">Multiplier</span>
              <span className="font-mono font-bold text-gray-700">{(t.multiplicador * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-gray-400">Clients</span>
              <span className="font-mono font-bold text-[#0087B8]">{counts[t.id] ?? 0}</span>
            </div>
          </Link>
        ))}
      </div>

      {tarifas.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          No pricing tiers found.<br />
          <span className="text-xs">Run the SQL migration to create Retail and Wholesale tiers.</span>
        </div>
      )}
    </div>
  );
}
