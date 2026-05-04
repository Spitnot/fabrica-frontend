// app/(dashboard)/clientes/page.tsx
// Client component — invite form, fetches, state, and submit logic preserved 1:1.
// JSX restructured to match Foundry mockup: dark header, tier as TweakRadio-style
// strip, grid of avatar rows.

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader, FR } from '@/components/fr/Atoms';

interface Tarifa { id: string; nombre: string; }
interface Customer {
  id: string; first_name: string | null; last_name: string | null; company_name: string; email?: string;
  telefono?: string; estado: string; tarifa_id?: string; tarifa?: Tarifa;
  descuento_pct: number; ship_city?: string; ship_country?: string;
  created_at: string; onboarding_completed?: boolean;
}

const TARIFA_BG: Record<string, string> = {
  retail:    FR.yellow,   // warm
  wholesale: '#111',      // muted
};

function initials(first: string | null, last: string | null) {
  const a = (first ?? '').trim()[0] ?? '';
  const b = (last  ?? '').trim()[0] ?? '';
  const out = (a + b).toUpperCase();
  return out || '··';
}

const monoLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#888',
};

const sectionHeader: React.CSSProperties = {
  padding: '12px 16px', background: '#111', color: '#fff',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontWeight: 700, fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

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
    fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, fontWeight: 500,
    border: 'var(--border-dash)', borderRadius: 0, padding: '8px 12px',
    background: '#fff', color: '#111', outline: 'none', width: '100%',
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        title="CLIENTS"
        count={`${clients.length} REGISTERED`}
        actions={!showInvite && (
          <button className="btn-primary"
            onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(''); }}>
            + INVITE CLIENT
          </button>
        )}
      />

      {/* Invite form */}
      {showInvite && (
        <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
          <div style={sectionHeader}>
            <span>+ INVITE CLIENT</span>
            <button
              onClick={() => { setShowInvite(false); setInviteSent(false); setInviteError(''); }}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#fff', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {inviteSent ? (
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: FR.green, fontWeight: 700, marginBottom: 14, letterSpacing: '0.1em' }}>
                ✓ CLIENT CREATED — INVITE EMAIL SENT
              </div>
              <button onClick={() => { setShowInvite(false); setInviteSent(false); }} className="btn-ghost">DONE</button>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={monoLabel}>FULL NAME *</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="Carlos Mendez" style={inputSt} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={monoLabel}>EMAIL *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="carlos@empresa.com" style={inputSt} required />
                </div>
              </div>

              {/* Tier — segmented */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={monoLabel}>PRICING TIER</label>
                <div style={{ display: 'flex', border: 'var(--border-dash)', width: 'fit-content' }}>
                  {tarifas.map((t, i) => {
                    const active = inviteTarifa === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setInviteTarifa(t.id)}
                        style={{
                          padding: '10px 22px',
                          borderLeft: i === 0 ? 'none' : 'var(--border-dash)',
                          background: active ? '#111' : '#fff',
                          color: active ? '#fff' : '#111',
                          boxShadow: 'none', border: 'none',
                          fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                          fontWeight: 900, fontSize: 12, letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={monoLabel}>DISCOUNT (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={inviteDescuento}
                    onChange={e => setInviteDescuento(e.target.value)} placeholder="0" style={inputSt} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={monoLabel}>INTERNAL NOTES</label>
                  <input type="text" value={inviteNotas} onChange={e => setInviteNotas(e.target.value)}
                    placeholder="Special conditions…" style={inputSt} />
                </div>
              </div>

              {inviteError && (
                <div style={{ padding: '10px 14px', background: '#fff', border: '2px solid', borderColor: FR.red, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: FR.red }}>
                  {inviteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={inviting} className="btn-primary">
                  {inviting ? 'CREATING…' : 'CREATE & SEND INVITE'}
                </button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }} className="btn-ghost">
                  CANCEL
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Client grid */}
      <div style={{ border: 'var(--border-dash)', background: '#fff' }}>
        <div style={sectionHeader}>
          <span>◉ CLIENT REGISTRY</span>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.yellow }}>
            {loading ? 'LOADING…' : `${clients.length} TOTAL`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', fontSize: 12, color: '#888' }}>No clients registered yet.</div>
        ) : (
          <div>
            {/* Desktop column header */}
            <div className="fr-clients-head" style={{
              display: 'none',
              gridTemplateColumns: '60px 1.4fr 1.4fr 1fr 130px 110px 90px',
              padding: '10px 18px', gap: 12, alignItems: 'center',
              borderBottom: 'var(--border-dash)', background: '#f6efdf',
            }}>
              <style>{`@media(min-width:768px){.fr-clients-head{display:grid!important}.fr-client-row{display:grid!important;grid-template-columns:60px 1.4fr 1.4fr 1fr 130px 110px 90px!important}.fr-client-row > *{display:block!important}}`}</style>
              {['', 'CLIENT', 'COMPANY', 'EMAIL', 'TIER', 'STATUS', 'JOINED'].map(h => (
                <div key={h || 'avatar'} style={{ ...monoLabel, color: '#111' }}>{h}</div>
              ))}
            </div>

            {clients.map((c, i) => {
              const tarifaBg = c.tarifa ? (TARIFA_BG[c.tarifa.nombre.toLowerCase()] ?? '#888') : '#888';
              const tarifaFg = tarifaBg === FR.yellow ? '#111' : '#fff';
              const fullName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.id}`}
                  className="fr-client-row"
                  style={{
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                    padding: '14px 18px',
                    borderBottom: i < clients.length - 1 ? 'var(--border-light)' : 'none',
                    color: '#111', textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, flexShrink: 0,
                    background: '#111', color: FR.yellow,
                    border: 'var(--border-dash)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
                    fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em',
                  }}>
                    {initials(c.first_name, c.last_name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fullName}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>
                      {c.telefono ?? '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#555' }}>{c.company_name}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#555' }}>{c.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.tarifa && (
                      <span style={{
                        background: tarifaBg, color: tarifaFg,
                        padding: '4px 10px', border: 'var(--border-dash)',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        fontWeight: 700, fontSize: 10, letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                      }}>
                        {c.tarifa.nombre}
                      </span>
                    )}
                    {c.descuento_pct > 0 && (
                      <span style={{
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        fontSize: 10, color: FR.red, fontWeight: 700,
                      }}>
                        −{c.descuento_pct}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{
                      width: 'fit-content', padding: '2px 8px',
                      background: c.estado === 'active' ? FR.green : '#888', color: '#fff',
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                    }}>
                      {c.estado === 'active' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span style={{
                      width: 'fit-content', padding: '2px 8px',
                      background: c.onboarding_completed ? '#111' : FR.yellow,
                      color: c.onboarding_completed ? FR.yellow : '#111',
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                    }}>
                      {c.onboarding_completed ? 'ONBOARDED' : 'PENDING'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#888' }}>
                    {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
