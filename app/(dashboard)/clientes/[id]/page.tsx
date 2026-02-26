'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};
const STATUS_STYLES: Record<string, string> = {
  draft:       'text-gray-500 bg-gray-100 border-gray-200',
  confirmado:  'text-[#0087B8] bg-blue-50 border-blue-200',
  produccion:  'text-[#b85e00] bg-orange-50 border-orange-200',
  listo_envio: 'text-[#876693] bg-purple-50 border-purple-200',
  enviado:     'text-[#0DA265] bg-green-50 border-green-200',
  cancelado:   'text-[#D93A35] bg-red-50 border-red-200',
};
const TARIFA_STYLES: Record<string, string> = {
  retail:    'text-[#0087B8] bg-blue-50 border-blue-200',
  wholesale: 'text-[#876693] bg-purple-50 border-purple-200',
};

interface Tarifa { id: string; nombre: string; descripcion?: string; }

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
function initials(name: string) { return name.split(' ').map((w) => w[0]).slice(0, 2).join(''); }

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient]   = useState<any>(null);
  const [orders, setOrders]   = useState<any[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Pricing edit
  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingForm, setPricingForm]       = useState({ tarifa_id: '', descuento_pct: '0' });
  const [savingPricing, setSavingPricing]   = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const [clientRes, tarifasRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch('/api/tarifas'),
      ]);
      if (!clientRes.ok) { setError('Client not found'); setLoading(false); return; }
      const clientData  = await clientRes.json();
      const tarifasData = await tarifasRes.json();
      setClient(clientData.customer);
      setOrders(clientData.orders ?? []);
      setTarifas(tarifasData.data ?? []);
      setPricingForm({
        tarifa_id:    clientData.customer.tarifa_id ?? '',
        descuento_pct: String(clientData.customer.descuento_pct ?? 0),
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function savePricing() {
    setSavingPricing(true); setPricingSuccess('');
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tarifa_id:    pricingForm.tarifa_id || null,
        descuento_pct: parseFloat(pricingForm.descuento_pct) || 0,
      }),
    });
    setSavingPricing(false);
    if (res.ok) {
      const tarifa = tarifas.find(t => t.id === pricingForm.tarifa_id);
      setClient((prev: any) => ({
        ...prev,
        tarifa_id:    pricingForm.tarifa_id || null,
        descuento_pct: parseFloat(pricingForm.descuento_pct) || 0,
        tarifa,
      }));
      setPricingSuccess('Saved');
      setEditingPricing(false);
      setTimeout(() => setPricingSuccess(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
        <div className="w-4 h-4 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-7">
        <div className="text-sm text-[#D93A35]">{error || 'Client not found'}</div>
        <Link href="/clientes" className="text-xs text-[#D93A35] mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const address = client.direccion_envio as any;
  const totalBilled = orders.reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  const tarifaNombre = client.tarifa?.nombre ?? '—';
  const tarifaKey    = tarifaNombre.toLowerCase();
  const tarifaCls    = TARIFA_STYLES[tarifaKey] ?? 'text-gray-600 bg-gray-100 border-gray-200';
  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7">
      <Link href="/clientes" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        ← Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-[#D93A35] flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
          {initials(client.contacto_nombre)}
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>{client.contacto_nombre}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{client.company_name}</p>
        </div>
        <div className="ml-auto">
          <Link href={`/pedidos/nuevo?cliente=${id}`}
            className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
            + New Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

        {/* LEFT — order history */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">Order History</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['ID', 'Status', 'Weight', 'Amount', 'Date'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No orders yet</td></tr>
                  ) : (
                    orders.map((o: any) => (
                      <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/pedidos/${o.id}`} className="font-mono text-xs text-[#D93A35] hover:text-[#b52e2a] transition-colors">
                            {o.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[o.status]}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            {STATUS_LABELS[o.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.peso_total} kg</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(o.total_productos)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">
                          {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-1">Orders</div>
              <div className="text-2xl font-black text-[#0087B8]" style={{ fontFamily: 'var(--font-alexandria)' }}>{orders.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-1">Billed</div>
              <div className="text-lg font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(totalBilled)}</div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Pricing</span>
              <button onClick={() => setEditingPricing(p => !p)}
                className="text-[11px] text-[#D93A35] font-semibold hover:text-[#b52e2a] transition-colors">
                {editingPricing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="p-4">
              {!editingPricing ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Tier</span>
                    {client.tarifa ? (
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md tracking-wide uppercase ${tarifaCls}`}>
                        {tarifaNombre}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Personal discount</span>
                    <span className={`font-mono text-xs font-bold ${client.descuento_pct > 0 ? 'text-[#D93A35]' : 'text-gray-400'}`}>
                      {client.descuento_pct > 0 ? `-${client.descuento_pct}%` : '—'}
                    </span>
                  </div>
                  {pricingSuccess && (
                    <div className="text-[11px] text-[#0DA265] font-semibold text-center pt-1">{pricingSuccess}</div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Tier</label>
                    <select value={pricingForm.tarifa_id} onChange={e => setPricingForm(p => ({ ...p, tarifa_id: e.target.value }))}
                      className={inputCls}>
                      <option value="">— No tier —</option>
                      {tarifas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Personal discount (%)</label>
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={pricingForm.descuento_pct}
                      onChange={e => setPricingForm(p => ({ ...p, descuento_pct: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <button onClick={savePricing} disabled={savingPricing}
                    className="w-full py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                    {savingPricing ? 'Saving…' : 'Save Pricing'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Contact</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${
                client.estado === 'active' ? 'text-[#0DA265] bg-green-50 border-green-200' : 'text-gray-400 bg-gray-100 border-gray-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {client.estado === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {[
                ['Email',   client.email],
                ['Phone',   client.telefono ?? '—'],
                ['VAT ID',  client.nif_cif],
                ['Joined',  new Date(client.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-mono text-xs text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Shipping Address</span>
            </div>
            <div className="p-4">
              {address ? (
                <>
                  <div className="text-sm text-gray-700">{address.street}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{address.postal_code} {address.city}</div>
                  <div className="font-mono text-xs text-gray-400 mt-0.5">{address.country}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">No address on file</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
