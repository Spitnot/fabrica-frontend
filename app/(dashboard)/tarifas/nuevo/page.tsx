'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevaTarifaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm] = useState({ nombre: '', descripcion: '', multiplicador: '1' });

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })); }

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/tarifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, descripcion: form.descripcion || null, multiplicador: parseFloat(form.multiplicador) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating tier');
      router.push(`/tarifas/${data.id}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="fr-page" style={{ maxWidth: 520 }}>
      <div>
        <Link href="/tarifas" className="fr-label" style={{ color: '#111', textDecoration: 'none' }}>← Pricing Tiers</Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>New Tier</h1>
      </div>

      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fr-label">Name <span style={{ color: '#D93A35' }}>*</span></label>
          <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="e.g. Wholesale" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fr-label">Description</label>
          <input type="text" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Optional description" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fr-label">Price multiplier <span style={{ color: '#D93A35' }}>*</span></label>
          <input type="number" min="0" step="0.01" value={form.multiplicador} onChange={e => set('multiplicador', e.target.value)} style={{ width: 160 }} />
          <p style={{ fontSize: 11, color: '#111' }}>Applied to base price. 1 = 100%, 0.8 = 80%, 1.2 = 120%. Per-SKU overrides after creation.</p>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', border: '1px solid #D93A35', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSubmit} disabled={!form.nombre || loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Tier'}
          </button>
          <Link href="/tarifas"><button type="button" className="btn-ghost">Cancel</button></Link>
        </div>
      </div>
    </div>
  );
}
