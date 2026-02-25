'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    contacto_nombre: '', company_name: '', email: '', password: '',
    telefono: '', nif_cif: '', street: '', city: '', postal_code: '', country: 'ES',
  });

  function set(key: string, value: string) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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

        <p className="text-[11px] text-gray-400">
          A Supabase Auth user will be created with role <span className="font-mono text-gray-600">customer</span> and access credentials sent to the client.
        </p>
      </div>
    </div>
  );
}
