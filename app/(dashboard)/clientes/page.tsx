import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Customer } from '@/types';

async function getClients(): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*, tarifa:tarifa_id(id, nombre)')
    .order('created_at', { ascending: false });
  if (error) { console.error('[clients]', error.message); return []; }
  return data ?? [];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

const TARIFA_STYLES: Record<string, string> = {
  retail:    'text-[#0087B8] bg-blue-50 border-blue-200',
  wholesale: 'text-[#876693] bg-purple-50 border-purple-200',
};

function tarifaBadge(tarifa?: { nombre: string }) {
  if (!tarifa) return null;
  const key = tarifa.nombre.toLowerCase();
  const cls = TARIFA_STYLES[key] ?? 'text-gray-600 bg-gray-100 border-gray-200';
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md tracking-wide uppercase ${cls}`}>
      {tarifa.nombre}
    </span>
  );
}

export default async function ClientesPage() {
  const clients = await getClients();

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Clients</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link href="/clientes/nuevo"
          className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
          + New Client
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-gray-50">
                {['Client', 'Company', 'Tier', 'Email', 'Phone', 'City', 'Status', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No clients registered yet</td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-[#D93A35] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {initials(c.contacto_nombre)}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-[#D93A35] transition-colors">
                          {c.contacto_nombre}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.company_name}</td>
                    <td className="px-5 py-3">
                      {tarifaBadge(c.tarifa)}
                      {c.descuento_pct > 0 && (
                        <span className="ml-1.5 text-[10px] font-mono text-[#D93A35] font-bold">-{c.descuento_pct}%</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{c.email}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{c.telefono ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{(c.direccion_envio as any)?.city ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${
                        c.estado === 'active'
                          ? 'text-[#0DA265] bg-green-50 border-green-200'
                          : 'text-gray-400 bg-gray-100 border-gray-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {c.estado === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
