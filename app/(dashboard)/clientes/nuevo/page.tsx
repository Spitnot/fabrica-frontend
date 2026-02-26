'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Tarifa { id: string; nombre: string; descripcion?: string; }

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);

  const [form, setForm] = useState({
    contacto_nombre: '', company_name: '', email: '', password: '',
    telefono: '', nif_cif: '', street: '', city: '', postal_code: '', country: 'ES',
    tarifa_id: '', descuento_pct: '0',
  });

  useEffect(() => {
    fetch('/api/tarifas')
      .then(r => r.json())
      .then(d => {
        const list: Tarifa[] = d.data ?? [];
        setTarifas(list);
        // Default al primer Wholesale que encuentre
        const wholesale = list.find(t => t.nombre.toLowerCase() === 'wholesale');
        if (wholesale) setForm(p => ({ ...p, tarifa_id: wholesale.id }));
      });
  }, []);

  function set(key: string, value: string) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tarifa_id:    form.tarifa_id || null,
          descuento_pct: parseFloat(form.descuento_pct) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating client');
      router.push(`/clientes/${data.id}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  const fields = [
    { key: 'contacto_nombre', label: 'Contact name',     placeholder: 'Carlos Mendez',     required: true  },
    { key: 'company_name',    label: 'Company',           placeholder: 'Fashion SL',        required: true  },
    { key: 'email',           label: 'Email',             placeholder: 'carlos@company.com', required: true  },
    { key: 'password',        label: 'Initial password',  placeholder: '••••••••',          required: true, type: 'password' },
    { key: 'nif_cif',         label: 'VAT ID',            placeholder: 'B12345678',         required: true  },
    { key: 'telefono',        label: 'Phone',             placeholder: '+34 612 345 678',   required: false },
  ];

  const addressFields = [
    { key: 'street',      label: 'Street & number', placeholder: 'Gran Via 14',  required: true  },
    { key: 'city',        label: 'City',             placeholder: 'Madrid',       required: true  },
    { key: 'postal_code', label: 'Postal code',      placeholder: '28013',        required: true  },
    { key: 'country',     label: 'Country code',     placeholder: 'ES',           required: true  },
  ];

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7 max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
        <Link href="/clientes" className="hover:text-gray-600 transition-colors">← Clients</Link>
        <span>/</span>
        <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
            style={{ fontFamily: 'var(--font-alexandria)' }}>New Client</h1>
      </div>

      <div className="space-y-5">
        {/* Contact info */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">1 · Contact Info</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ key, label, placeholder, required, type }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                  {label} {required && <span className="text-[#D93A35]">*</span>}
                </label>
                <input type={type ?? 'text'} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder} className={inputCls} />
              </div>
            ))}
          </div>
        </section>

        {/* Shipping address */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">2 · Shipping Address</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addressFields.map(({ key, label, placeholder, required }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                  {label} {required && <span className="text-[#D93A35]">*</span>}
                </label>
                <input type="text" value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder} className={inputCls} />
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">3 · Pricing</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                Pricing Tier <span className="text-[#D93A35]">*</span>
              </label>
              <select value={form.tarifa_id} onChange={e => set('tarifa_id', e.target.value)}
                className={inputCls}>
                <option value="">— Select tier —</option>
                {tarifas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.descripcion ? ` — ${t.descripcion}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                Personal Discount (%)
              </label>
              <input
                type="number" min="0" max="100" step="0.5"
                value={form.descuento_pct}
                onChange={e => set('descuento_pct', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
              <p className="text-[10px] text-gray-400">Applied on top of the tier price. 0 = no discount.</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#D93A35]">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating client…' : 'Create Client'}
          </button>
          <Link href="/clientes"
            className="px-6 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
