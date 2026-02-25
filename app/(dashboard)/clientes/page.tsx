import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Customer } from '@/types';

async function getClients(): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[clientes]', error.message);
    return [];
  }
  return data ?? [];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

export default async function ClientesPage() {
  const clients = await getClients();

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Clientes</h1>
    <p className="text-xs text-zinc-500 mt-1">
      {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrados
    </p>
  </div>
  <Link
    href="/clientes/nuevo"
    className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 transition-colors"
  >
    + Nuevo Cliente
  </Link>
</div>

      <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Cliente', 'Empresa', 'Email', 'Teléfono', 'Ciudad', 'Estado', 'Alta'].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 border-b border-[#282828]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-600">
                  No hay clientes registrados todavía
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                        {initials(c.contacto_nombre)}
                      </div>
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {c.contacto_nombre}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400">{c.company_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">{c.email}</td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">{c.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-zinc-400">
                    {(c.direccion_envio as any)?.city ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${
                      c.estado === 'active'
                        ? 'text-emerald-300 bg-emerald-950 border-emerald-800'
                        : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {c.estado === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                    {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
