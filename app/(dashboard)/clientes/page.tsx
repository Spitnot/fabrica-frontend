'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tarifa { id: string; nombre: string; }
interface Customer {
  id: string; first_name: string | null; last_name: string | null; company_name: string; email?: string;
  estado: string; tarifa_id?: string; tarifa?: Tarifa;
  descuento_pct: number; created_at: string; onboarding_completed?: boolean;
}

function initials(first: string | null, last: string | null) {
  const a = (first ?? '').trim()[0] ?? '';
  const b = (last  ?? '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '··';
}

export default function ClientesPage() {
  const [clients, setClients]           = useState<Customer[]>([]);
  const [tarifas, setTarifas]           = useState<Tarifa[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteName, setInviteName]     = useState('');
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteTarifa, setInviteTarifa] = useState('');
  const [inviteDescuento, setInviteDescuento] = useState('0');
  const [inviteNotas, setInviteNotas]   = useState('');
  const [inviting, setInviting]         = useState(false);
  const [inviteError, setInviteError]   = useState('');
  const [inviteSent, setInviteSent]     = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const [cRes, tRes] = await Promise.all([fetch('/api/customers'), fetch('/api/tarifas')]);
    const tList: Tarifa[] = (await tRes.json()).data ?? [];
    const tMap = Object.fromEntries(tList.map(t => [t.id, t]));
    setClients(((await cRes.json()).data ?? []).map((c: Customer) => ({ ...c, tarifa: c.tarifa_id ? tMap[c.tarifa_id] : undefined })));
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

  const cols = '48px 1.4fr 1.4fr 1fr 120px 100px 80px';

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="fr-label">{clients.length} registered</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Clients</h1>
        </div>
        {!showInvite && (
          <button className="btn-primary" onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(''); }}>
            + Invite client
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="fr-card">
          <div className="fr-section-head">
            <span>Invite client</span>
            <button onClick={() => { setShowInvite(false); setInviteSent(false); setInviteError(''); }}
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', fontSize: 16, padding: '0 4px', color: '#666' }}>
              ✕
            </button>
          </div>

          {inviteSent ? (
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#0DA265', fontWeight: 700, marginBottom: 16 }}>
                ✓ Client created — invite email sent
              </div>
              <button onClick={() => { setShowInvite(false); setInviteSent(false); }} className="btn-ghost">Done</button>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fr-label">Full name *</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Carlos Mendez" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fr-label">Email *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="carlos@empresa.com" required />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="fr-label">Pricing tier</label>
                <div style={{ display: 'flex', border: '1px solid #111', width: 'fit-content' }}>
                  {tarifas.map((t, i) => {
                    const active = inviteTarifa === t.id;
                    return (
                      <button key={t.id} type="button" onClick={() => setInviteTarifa(t.id)}
                        style={{
                          padding: '8px 20px',
                          borderLeft: i === 0 ? 'none' : '1px solid #111',
                          background: active ? '#111' : '#fff',
                          color: active ? '#fff' : '#111',
                          boxShadow: 'none', border: 'none',
                          fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                        }}>
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fr-label">Discount (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={inviteDescuento} onChange={e => setInviteDescuento(e.target.value)} placeholder="0" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fr-label">Internal notes</label>
                  <input type="text" value={inviteNotas} onChange={e => setInviteNotas(e.target.value)} placeholder="Special conditions…" />
                </div>
              </div>

              {inviteError && (
                <div style={{ padding: '10px 14px', border: '1px solid #D93A35', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>
                  {inviteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={inviting} className="btn-primary">
                  {inviting ? 'Creating…' : 'Create & send invite'}
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
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div className="fr-section-head">
          <span>Client registry</span>
          <span className="fr-label">{loading ? '—' : `${clients.length} total`}</span>
        </div>

        {loading ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', fontSize: 12, color: '#999' }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', fontSize: 12, color: '#999' }}>No clients registered yet.</div>
        ) : (
          <>
            <div className="fr-table-head fr-clients-head" style={{ gridTemplateColumns: cols }}>
              <style>{`@media(min-width:768px){.fr-clients-head{display:grid!important}.fr-client-row{display:grid!important}}`}</style>
              {['', 'Client', 'Company', 'Email', 'Tier', 'Status', 'Joined'].map(h => (
                <div key={h || 'av'} className="fr-label">{h}</div>
              ))}
            </div>
            {clients.map(c => {
              const fullName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="fr-row fr-client-row"
                  style={{ gridTemplateColumns: cols, display: 'flex', flexWrap: 'wrap' }}>
                  <div style={{ width: 36, height: 36, background: '#111', color: '#F6E451', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                    {initials(c.first_name, c.last_name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{c.company_name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#666' }}>{c.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.tarifa && (
                      <span style={{ padding: '2px 8px', border: '1px solid #111', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {c.tarifa.nombre}
                      </span>
                    )}
                    {c.descuento_pct > 0 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#D93A35', fontWeight: 700 }}>−{c.descuento_pct}%</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ padding: '2px 6px', background: c.estado === 'active' ? '#0DA265' : '#999', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content' }}>
                      {c.estado === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    {!c.onboarding_completed && (
                      <span style={{ padding: '2px 6px', background: '#E6883E', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content' }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="fr-label" style={{ color: '#999' }}>
                    {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
