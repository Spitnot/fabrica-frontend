'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MOCK_CLIENT = {
  id: 'c1',
  name: 'Carlos Mendez',
  company: 'Moda Urbana SL',
  email: 'carlos@modaurbana.es',
  phone: '+34 612 345 678',
  address: { street: 'Calle Mayor 14', city: 'Madrid', postal_code: '28013', country: 'ES' },
  created_at: '2024-06-01',
};

const MOCK_ORDERS = [
  { id: 'o1', reference: 'ORD-2026-0042', status: 'listo_envio', total: 472.90, created_at: '2026-02-20', items: 2 },
  { id: 'o4', reference: 'ORD-2026-0039', status: 'confirmado',  total: 259.90, created_at: '2026-02-22', items: 1 },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', confirmado: 'Confirmado', produccion: 'En Producción',
  listo_envio: 'Listo para Envío', enviado: 'Enviado', cancelado: 'Cancelado',
};
const STATUS_STYLES: Record<string, string> = {
  draft: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  confirmado: 'text-sky-300 bg-sky-950 border-sky-800',
  produccion: 'text-amber-300 bg-amber-950 border-amber-800',
  listo_envio: 'text-violet-300 bg-violet-950 border-violet-800',
  enviado: 'text-emerald-300 bg-emerald-950 border-emerald-800',
  cancelado: 'text-red-400 bg-red-950 border-red-900',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

export default function ClientePerfilPage() {
  const params = useParams();
  // TODO: reemplazar con fetch(`/api/clients/${params.id}`)
  const client = MOCK_CLIENT;
  const orders = MOCK_ORDERS;

  const totalFacturado = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="p-7">

      {/* Back */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
      >
        ← Volver a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-amber-400 flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
          {initials(client.name)}
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-200">{client.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{client.company}</p>
        </div>
        <div className="ml-auto">
          <Link
            href="/pedidos/nuevo"
            className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 transition-colors"
          >
            + Nuevo Pedido
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* ── LEFT: Historial pedidos ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">
              Historial de Pedidos
            </span>
            <div className="flex-1 h-px bg-[#282828]" />
          </div>

          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Referencia', 'Estado', 'Ítems', 'Total', 'Fecha'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 border-b border-[#282828]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-600">
                      Sin pedidos aún
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/pedidos/${o.id}`} className="font-mono text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                          {o.reference}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[o.status]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-400">{o.items}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-zinc-200">{fmt(o.total)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500">{o.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Info cliente ── */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141414] border border-[#282828] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500 mb-1">Pedidos</div>
              <div className="text-2xl font-bold text-zinc-200">{orders.length}</div>
            </div>
            <div className="bg-[#141414] border border-[#282828] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500 mb-1">Facturado</div>
              <div className="text-lg font-bold text-amber-400">{fmt(totalFacturado)}</div>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Contacto</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Email',    client.email],
                ['Teléfono', client.phone],
                ['Alta',     client.created_at],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="font-mono text-xs text-zinc-400 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dirección */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Dirección de envío</span>
            </div>
            <div className="p-4">
              <div className="text-sm text-zinc-300">{client.address.street}</div>
              <div className="text-sm text-zinc-400 mt-0.5">
                {client.address.postal_code} {client.address.city}
              </div>
              <div className="font-mono text-xs text-zinc-600 mt-0.5">{client.address.country}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
