'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tarifa { id: string; nombre: string; }
interface Customer {
  id: string;
  contacto_nombre: string;
  company_name: string;
  email: string;
  telefono?: string;
  estado: string;
  tarifa_id?: string;
  tarifa?: Tarifa;
  descuento_pct: number;
  direccion_envio?: { city?: string };
  created_at: string;
  onboarding_completed?: boolean;
}

const TARIFA_STYLES: Record<string, string> = {
  retail:    'text-[#0087B8] bg-blue-50 border-blue-200',
  wholesale: 'text-[#876693] bg-purple-50 border-purple-200',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

function tarifaBadge(tarifa?: Tarifa) {
  if (!tarifa) return null;
  const key = tarifa.nombre.toLowerCase();
  const cls = TARIFA_STYLES[key] ?? 'text-gray-600 bg-gray-100 border-gray-200';
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md tracking-wide uppercase ${cls}`}>
      {tarifa.nombre}
    </span>
  );
}

export default function ClientesPage() {
  const [clients, setClients]   = useState<Customer[]>([]);
  const [tarifas, setTarifas]   = useState<Tarifa[]>([]);
  const [loading, setLoading]   = useState(true);

  const [showInvite, setShowInvite]   = useState(false);
  const [inviteName, setInviteName]   = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTarifa, setInviteTarifa] = useState('');
  const [inviteDescuento, setInviteDescuento] = useState('0');
  const [inviteNotas, setInviteNotas] = useState('');
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent]   = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const [clientsRes, tarifasRes] = await Promise.all([
      fetch('/api/customers'),
      fetch('/api/tarifas'),
    ]);
    const clientsData = await clientsRes.json();
    const tarifasData = await tarifasRes.json();
    const tarifaList: Tarifa[] = tarifasData.data ?? [];
    const tarifaMap = Object.fromEntries(tarifaList.map((t) => [t.id, t]));
    const raw = clientsData.data ?? [];
    setClients(raw.map((c: Customer) => ({ ...c, tarifa: c.tarifa_id ? tarifaMap[c.tarifa_id] : undefined })));
    setTarifas(tarifaList);
    // Pre-select Wholesale
    const wholesale = tarifaList.find(t => t.nombre.toLowerCase() === 'wholesale');
    if (wholesale && !inviteTarifa) setInviteTarifa(wholesale.id);
    setLoading(false);
  }, []);  // eslint-disable-line

  useEffect(() => { loadClients(); }, [loadClients]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(''); setInviting(true); setInviteSent(false);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacto_nombre: inviteName,
          email:           inviteEmail,
          tarifa_id:       inviteTarifa   || null,
          descuento_pct:   parseFloat(inviteDescuento) || 0,
          condiciones_comerciales: { notas_especiales: inviteNotas || null },
          // Required fields with defaults — client will complete via onboarding
          company_name:    inviteName,
          nif_cif:         '',
          tipo_fiscal:     'NIF/CIF',
          tipo_cliente:    null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating client');
      setInviteSent(true);
      setInviteName(''); setInviteEmail(''); setInviteDescuento('0'); setInviteNotas('');
      loadClients();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

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
        {!showInvite && (
          <button
            onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(''); }}
            className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
            + Invite Client
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                  style={{ fontFamily: 'var(--font-alexandria)' }}>Invite Client</span>
            <button onClick={() => { setShowInvite(false); setInviteSent(false); setInviteError(''); }}
                    className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>

          {inviteSent ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#0DA265] text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Client created. Invite email sent — they'll complete their profile on first login.
              </div>
              <button onClick={() => { setShowInvite(false); setInviteSent(false); }}
                      className="text-sm font-semibold text-[#D93A35] hover:underline">Done</button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                    Full Name <span className="text-[#D93A35]">*</span>
                  </label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="Carlos Mendez" className={inputCls} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                    Email <span className="text-[#D93A35]">*</span>
                  </label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="carlos@empresa.com" className={inputCls} required />
                </div>
              </div>

              {/* Tier selector — same pattern as role in team */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Pricing Tier</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {tarifas.map((t) => (
                    <button key={t.id} type="button" onClick={() => setInviteTarifa(t.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        inviteTarifa === t.id
                          ? 'border-[#D93A35]/50 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="text-sm font-semibold text-gray-900">{t.nombre}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Discount (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={inviteDescuento}
                    onChange={e => setInviteDescuento(e.target.value)}
                    placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Internal notes</label>
                  <input type="text" value={inviteNotas} onChange={e => setInviteNotas(e.target.value)}
                    placeholder="Special conditions, exceptions…" className={inputCls} />
                </div>
              </div>

              {inviteError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">
                  {inviteError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={inviting}
                  className="px-5 py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                  {inviting ? 'Creating…' : 'Create & Send Invite'}
                </button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }}
                  className="px-5 py-2 border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
              Loading…
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center text-sm text-gray-400">No clients registered yet</div>
        ) : clients.map((c) => (
          <Link key={c.id} href={`/clientes/${c.id}`}
            className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-[#D93A35]/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#D93A35] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {initials(c.contacto_nombre)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#D93A35] transition-colors">
                  {c.contacto_nombre}
                </div>
                <div className="text-xs text-gray-400 truncate">{c.company_name} · {c.direccion_envio?.city ?? '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tarifaBadge(c.tarifa)}
              {!c.onboarding_completed && (
                <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold border rounded-md text-amber-600 bg-amber-50 border-amber-200">
                  Pending
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-gray-50">
                {['Client', 'Company', 'Tier', 'Email', 'Status', 'Onboarding', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No clients registered yet</td>
                </tr>
              ) : clients.map((c) => (
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
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md ${
                      c.onboarding_completed
                        ? 'text-[#0DA265] bg-green-50 border-green-200'
                        : 'text-amber-600 bg-amber-50 border-amber-200'
                    }`}>
                      {c.onboarding_completed ? 'Complete' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}