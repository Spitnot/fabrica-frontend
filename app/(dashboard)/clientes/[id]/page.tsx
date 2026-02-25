'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', confirmado: 'Confirmado', produccion: 'En Producción',
  listo_envio: 'Listo para Envío', enviado: 'Enviado', cancelado: 'Cancelado',
};
const STATUS_STYLES: Record<string, string> = {
  draft:       'text-zinc-400 bg-zinc-800 border-zinc-700',
  confirmado:  'text-sky-300 bg-sky-950 border-sky-800',
  produccion:  'text-amber-300 bg-amber-950 border-amber-800',
  listo_envio: 'text-violet-300 bg-violet-950 border-violet-800',
  enviado:     'text-emerald-300 bg-emerald-950 border-emerald-800',
  cancelado:   'text-red-400 bg-red-950 border-red-900',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient]   = useState<any>(null);
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function load() {
      // Cargar cliente
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) { setError('Cliente no encontrado'); setLoading(false); return; }
      const data = await res.json();
      setClient(data.customer);
      setOrders(data.orders ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-7 flex items-center gap-2 text-zinc-600 text-sm">
        <div className="w-4 h-4 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
        Cargando…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-7">
        <div className="text-sm text-red-400">{error || 'Cliente no encontrado'}</div>
        <Link href="/clientes" className="text-xs text-amber-400 mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const address = client.direccion_envio as any;
  const totalFacturado = orders.reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);

  return (
    <div className="p-7">
      <Link href="/clientes" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
        ← Volver a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-amber-400 flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
          {initials(client.contacto_nombre)}
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-200">{client.contacto_nombre}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{client.company_name}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/pedidos/nuevo?cliente=${id}`}
            className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 transition-colors"
          >
            + Nuevo Pedido
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* LEFT — historial pedidos */}
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
                  {['ID', 'Estado', 'Peso', 'Total', 'Fecha'].map((h) => (
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
                  orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1c1c1c] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/pedidos/${o.id}`} className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors">
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${STATUS_STYLES[o.status]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400">{o.peso_total} kg</td>
                      <td className="px-5 py-3 text-sm font-semibold text-zinc-200">{fmt(o.total_productos)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                        {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — info cliente */}
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

          {/* Contacto */}
          <div className="bg-[#141414] border border-[#282828] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Contacto</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${
                client.estado === 'active'
                  ? 'text-emerald-300 bg-emerald-950 border-emerald-800'
                  : 'text-zinc-400 bg-zinc-800 border-zinc-700'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {client.estado === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Email',    client.email],
                ['Teléfono', client.telefono ?? '—'],
                ['NIF/CIF',  client.nif_cif],
                ['Alta',     new Date(client.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })],
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
              {address ? (
                <>
                  <div className="text-sm text-zinc-300">{address.street}</div>
                  <div className="text-sm text-zinc-400 mt-0.5">{address.postal_code} {address.city}</div>
                  <div className="font-mono text-xs text-zinc-600 mt-0.5">{address.country}</div>
                </>
              ) : (
                <div className="text-sm text-zinc-600">Sin dirección</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
