'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevaTarifaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    nombre: '', descripcion: '', multiplicador: '1',
  });

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })); }

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/tarifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:       form.nombre,
          descripcion:  form.descripcion || null,
          multiplicador: parseFloat(form.multiplicador) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating tier');
      router.push(`/tarifas/${data.id}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7 max-w-lg">
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
        <Link href="/tarifas" className="hover:text-gray-600 transition-colors">← Pricing Tiers</Link>
        <span>/</span>
        <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
            style={{ fontFamily: 'var(--font-alexandria)' }}>New Tier</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
            Name <span className="text-[#D93A35]">*</span>
          </label>
          <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
            placeholder="e.g. Wholesale" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Description</label>
          <input type="text" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder="Optional description" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
            Price multiplier <span className="text-[#D93A35]">*</span>
          </label>
          <input type="number" min="0" step="0.01" value={form.multiplicador}
            onChange={e => set('multiplicador', e.target.value)} className={inputCls} />
          <p className="text-[10px] text-gray-400">
            Applied to the base catalogue price. 1 = 100% (no change), 0.8 = 80%, 1.2 = 120%.
            Per-SKU overrides can be set after creation.
          </p>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={handleSubmit} disabled={!form.nombre || loading}
            className="px-5 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating…' : 'Create Tier'}
          </button>
          <Link href="/tarifas"
            className="px-5 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
