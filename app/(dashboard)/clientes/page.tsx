'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tarifa { id: string; nombre: string; }
interface Customer {
  id: string; contacto_nombre: string; company_name: string; email: string;
  telefono?: string; estado: string; tarifa_id?: string; tarifa?: Tarifa;
  descuento_pct: number; direccion_envio?: { city?: string };
  created_at: string; onboarding_completed?: boolean;
}

const TARIFA_COLORS: Record<string, string> = {
  retail:    '#0087B8',
  wholesale: '#876693',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ClientesPage() {
  const [clients, setClients]         = useState<Customer[]>([]);
  const [tarifas, setTarifas]         = useState<Tarifa[]>([]);
  const [loading, setLoading]         = useState(true);
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
    const [cRes, tRes] = await Promise.all([fetch('/api/customers'), fetch('/api/tarifas')]);
    const cData = await cRes.json();
    const tData = await tRes.json();
    const tList: Tarifa[] = tData.data ?? [];
    const tMap = Object.fromEntries(tList.map((t) => [t.id, t]));
    setClients((cData.data ?? []).map((c: Customer) => ({ ...c, tarifa: c.tarifa_id ? tMap[c.tarifa_id] : undefined })));
    setTarifas(tList);
    const wholesale = tList.find(t => t.nombre.toLowerCase() === 'wholesale');
    if (wholesale && !inviteTarifa) setInviteTarifa(wholesale.id);
    setLoading(false);
  }, []); // eslint-disable-line

  useEffect(() => { loadClients(); }, [loadClients]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(''); setInviting(true); setInviteSent(false);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacto_nombre: inviteName, email: inviteEmail,
          tarifa_id: inviteTarifa || null,
          descuento_pct: parseFloat(inviteDescuento) || 0,
          condiciones_comerciales: { notas_especiales: inviteNotas || null },
          company_name: inviteName, nif_cif: '', tipo_fiscal: 'NIF/CIF', tipo_cliente: null,
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

  const inputSt: React.CSSProperties = {
    fontFamily: 'var(--font-main)', fontSize: 12, fontWeight: 400,
    border: 'var(--border)', borderRadius: 0, padding: '7px 10px',
    background: '#fff', color: '#111', outline: 'none', width: '100%',
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: 'var(--border)' }}>
        <div>
          <div className="page-title">Clients</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3, letterSpacing: '0.04em' }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''} registered
          </div>
        </div>
        {!showInvite && (
          <button className="btn-primary" onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(''); }}>
            + Invite Client
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-label">Invite Client</span>
            <button
              onClick={() => { setShowInvite(false); setInviteSent(false); setInviteError(''); }}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#aaa', fontSize: 14, padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>

          {inviteSent ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#0DA265', fontWeight: 700, marginBottom: 12 }}>
                ✓ Client created — invite email sent.
              </div>
              <button onClick={() => { setShowInvite(false); setInviteSent(false); }} className="btn-ghost">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
                    Full Name *
                  </label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="Carlos Mendez" style={inputSt} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
                    Email *
                  </label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="carlos@empresa.com" style={inputSt} required />
                </div>
              </div>

              {/* Tier selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
                  Pricing Tier
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {tarifas.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInviteTarifa(t.id)}
                      style={{
                        padding: '8px 16px',
                        background: inviteTarifa === t.id ? '#111' : '#fff',
                        color: inviteTarifa === t.id ? '#fff' : '#111',
                        border: 'var(--border)',
                        boxShadow: inviteTarifa === t.id ? 'none' : 'var(--shadow-sm)',
                        transform: inviteTarifa === t.id ? 'translate(2px, 2px)' : 'none',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
                    Discount (%)
                  </label>
                  <input type="number" min="0" max="100" step="0.5" value={inviteDescuento}
                    onChange={e => setInviteDescuento(e.target.value)} placeholder="0" style={inputSt} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
                    Internal notes
                  </label>
                  <input type="text" value={inviteNotas} onChange={e => setInviteNotas(e.target.value)}
                    placeholder="Special conditions…" style={inputSt} />
                </div>
              </div>

              {inviteError && (
                <div style={{ padding: '8px 12px', background: '#fff8f8', border: '1px solid #D93A35', fontSize: 11, color: '#D93A35' }}>
                  {inviteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={inviting} className="btn-primary">
                  {inviting ? 'Creating…' : 'Create & Send Invite'}
                </button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Client', 'Company', 'Tier', 'Email', 'Status', 'Onboarding', 'Joined'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>Loading…</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>No clients registered yet.</td>
                </tr>
              ) : clients.map((c, i) => {
                const tarifaColor = c.tarifa ? (TARIFA_COLORS[c.tarifa.nombre.toLowerCase()] ?? '#555') : '#555';
                return (
                  <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={{ padding: '9px 14px' }}>
                      <Link href={`/clientes/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 28, height: 28, background: '#D93A35', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                          {initials(c.contacto_nombre)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{c.contacto_nombre}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#555' }}>{c.company_name}</td>
                    <td style={{ padding: '9px 14px' }}>
                      {c.tarifa && (
                        <span className="badge" style={{ background: tarifaColor }}>
                          {c.tarifa.nombre}
                        </span>
                      )}
                      {c.descuento_pct > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 9, fontFamily: 'monospace', color: '#D93A35', fontWeight: 700 }}>
                          -{c.descuento_pct}%
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{c.email}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span className="badge" style={{ background: c.estado === 'active' ? '#0DA265' : '#999' }}>
                        {c.estado === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <span className="badge" style={{ background: c.onboarding_completed ? '#0DA265' : '#E6883E' }}>
                        {c.onboarding_completed ? 'Complete' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
