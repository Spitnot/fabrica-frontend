'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: '#876693', confirmado: '#0087B8', produccion: '#E6883E',
  listo_envio: '#0DA265', enviado: '#111', cancelado: '#999',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};
const TARIFA_COLORS: Record<string, string> = { retail: '#0087B8', wholesale: '#876693' };

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

interface Tarifa { id: string; nombre: string; }

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient]     = useState<any>(null);
  const [orders, setOrders]     = useState<any[]>([]);
  const [tarifas, setTarifas]   = useState<Tarifa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editPricing, setEditPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({ tarifa_id: '', descuento_pct: '0' });
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    async function load() {
      const [cRes, tRes] = await Promise.all([fetch(`/api/customers/${id}`), fetch('/api/tarifas')]);
      if (!cRes.ok) { setError('Client not found'); setLoading(false); return; }
      const cData = await cRes.json();
      const tData = await tRes.json();
      setClient(cData.customer);
      setOrders(cData.orders ?? []);
      setTarifas(tData.data ?? []);
      setPricingForm({ tarifa_id: cData.customer.tarifa_id ?? '', descuento_pct: String(cData.customer.descuento_pct ?? 0) });
      setLoading(false);
    }
    load();
  }, [id]);

  async function savePricing() {
    setSavingPricing(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarifa_id: pricingForm.tarifa_id || null, descuento_pct: parseFloat(pricingForm.descuento_pct) || 0 }),
    });
    setSavingPricing(false);
    if (res.ok) {
      const tarifa = tarifas.find(t => t.id === pricingForm.tarifa_id);
      setClient((prev: any) => ({ ...prev, tarifa_id: pricingForm.tarifa_id || null, descuento_pct: parseFloat(pricingForm.descuento_pct) || 0, tarifa }));
      setEditPricing(false);
    }
  }

  async function handleResendInvite() {
    setResending(true); setResendMsg(''); setError('');
    const res = await fetch(`/api/customers/${id}/resend-invite`, { method: 'POST' });
    setResending(false);
    if (res.ok) { setResendMsg('Invite sent!'); setTimeout(() => setResendMsg(''), 4000); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed to resend'); }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/clientes');
    else { setDeleting(false); setConfirmDelete(false); setError('Failed to delete.'); }
  }

  const inputSt: React.CSSProperties = { fontFamily: 'var(--font-main)', fontSize: 12, border: '1px solid #111', borderRadius: 0, padding: '7px 10px', background: '#fff', color: '#111', outline: 'none', width: '100%' };

  if (loading) return <div style={{ padding: 24, fontSize: 12, color: '#aaa' }}>Loading…</div>;
  if (error || !client) return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 12, color: '#D93A35', marginBottom: 8 }}>{error || 'Client not found'}</div>
      <Link href="/clientes" style={{ fontSize: 10, color: '#D93A35', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>← Back</Link>
    </div>
  );

  const address = (client as any).ship_street1
    ? { street: (client as any).ship_street1, city: (client as any).ship_city, postal_code: (client as any).ship_postal_code, country: (client as any).ship_country }
    : client.direccion_envio as any;
  const clientName = (client as any).first_name
    ? `${(client as any).first_name} ${(client as any).last_name ?? ""}`.trim()
    : client.contacto_nombre ?? "—";
  const totalBilled = orders.reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  const tarifaColor = client.tarifa ? (TARIFA_COLORS[client.tarifa.nombre.toLowerCase()] ?? '#555') : '#555';

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

      <Link href="/clientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 16, textDecoration: 'none' }}>
        ← Clients
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: '#D93A35', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initials(clientName)}
          </div>
          <div>
            <div className="page-title">{clientName}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{client.company_name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {resendMsg && <span style={{ fontSize: 10, color: '#0DA265', fontWeight: 700 }}>{resendMsg}</span>}
          <button onClick={handleResendInvite} disabled={resending} className="btn-ghost">
            {resending ? 'Sending…' : 'Resend Invite'}
          </button>
          <Link href={`/pedidos/nuevo?cliente=${id}`}>
            <button className="btn-primary">+ New Order</button>
          </Link>
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'transparent', border: '1px solid #ddd', boxShadow: 'none', color: '#D93A35', borderColor: '#D93A35' }}>
            Delete
          </button>
        </div>
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 380, width: '100%', padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Delete Client</div>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently delete <strong>{clientName}</strong> and all their data.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="fr-cliente-grid">
        <style>{`@media(min-width:768px){.fr-cliente-grid{grid-template-columns:1fr 260px!important}}`}</style>

        {/* LEFT — orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #111' }}>
              <span className="section-label">Order History</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#111' }}>
                    {['Ref', 'Status', 'Weight', 'Amount', 'Date'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>No orders yet</td></tr>
                  ) : orders.map((o: any, i: number) => (
                    <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <td style={{ padding: '9px 14px' }}>
                        <Link href={`/pedidos/${o.id}`} style={{ fontSize: 10, fontWeight: 700, color: '#D93A35', fontFamily: 'monospace' }}>
                          #{o.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span className="badge" style={{ background: STATUS_COLORS[o.status] ?? '#999' }}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{o.peso_total} kg</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 900, color: '#111' }}>{fmt(o.total_productos)}</td>
                      <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="card" style={{ borderLeft: '3px solid #0087B8' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Orders</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0087B8', lineHeight: 1 }}>{orders.length}</div>
            </div>
            <div className="card" style={{ borderLeft: '3px solid #D93A35' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Billed</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#D93A35', lineHeight: 1 }}>{fmt(totalBilled)}</div>
            </div>
          </div>

          {/* Pricing */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-label">Pricing</span>
              <button onClick={() => setEditPricing(p => !p)} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35', padding: 0 }}>
                {editPricing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div style={{ padding: 14 }}>
              {!editPricing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: '#aaa' }}>Tier</span>
                    {client.tarifa ? (
                      <span className="badge" style={{ background: tarifaColor }}>{client.tarifa.nombre}</span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#aaa' }}>Discount</span>
                    <span style={{ fontWeight: 900, color: client.descuento_pct > 0 ? '#D93A35' : '#ccc', fontFamily: 'monospace' }}>
                      {client.descuento_pct > 0 ? `-${client.descuento_pct}%` : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Tier</label>
                    <select value={pricingForm.tarifa_id} onChange={e => setPricingForm(p => ({ ...p, tarifa_id: e.target.value }))} style={inputSt}>
                      <option value="">— No tier —</option>
                      {tarifas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Discount (%)</label>
                    <input type="number" min="0" max="100" step="0.5" value={pricingForm.descuento_pct} onChange={e => setPricingForm(p => ({ ...p, descuento_pct: e.target.value }))} style={inputSt} />
                  </div>
                  <button onClick={savePricing} disabled={savingPricing} className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
                    {savingPricing ? 'Saving…' : 'Save Pricing'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-label">Contact</span>
              <span className="badge" style={{ background: client.estado === 'active' ? '#0DA265' : '#999' }}>
                {client.estado === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Email', client.email],
                ['Phone', client.telefono ?? '—'],
                ['VAT ID', client.nif_cif],
                ['Joined', new Date(client.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#aaa', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#555', fontWeight: 600, textAlign: 'right', fontSize: 10, fontFamily: 'monospace' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee' }}>
              <span className="section-label">Shipping Address</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {address ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{address.street}</div>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{address.postal_code} {address.city}</div>
                  <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{address.country}</div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#aaa' }}>No address on file</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
