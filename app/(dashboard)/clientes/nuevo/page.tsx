'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    contacto_nombre: '',
    company_name:    '',
    email:           '',
    password:        '',
    telefono:        '',
    nif_cif:         '',
    street:          '',
    city:            '',
    postal_code:     '',
    country:         'ES',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear cliente');
      router.push(`/clientes/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const fields = [
    { key: 'contacto_nombre', label: 'Nombre de contacto', placeholder: 'Carlos Mendez',        required: true  },
    { key: 'company_name',    label: 'Empresa',             placeholder: 'Moda Urbana SL',       required: true  },
    { key: 'email',           label: 'Email',               placeholder: 'carlos@empresa.es',    required: true  },
    { key: 'password',        label: 'Contraseña inicial',  placeholder: '••••••••',             required: true, type: 'password' },
    { key: 'nif_cif',         label: 'NIF / CIF',           placeholder: 'B12345678',            required: true  },
    { key: 'telefono',        label: 'Teléfono',            placeholder: '+34 612 345 678',      required: false },
  ];

  const addressFields = [
    { key: 'street',      label: 'Calle y número', placeholder: 'Calle Mayor 14',  required: true  },
    { key: 'city',        label: 'Ciudad',          placeholder: 'Madrid',          required: true  },
    { key: 'postal_code', label: 'Código postal',   placeholder: '28013',           required: true  },
    { key: 'country',     label: 'País (código)',   placeholder: 'ES',              required: true  },
  ];

  return (
    <div className="p-7 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Clientes
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-200">Nuevo Cliente</h1>
      </div>

      <div className="space-y-5">

        {/* Datos de contacto */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">
              1 · Datos de contacto
            </span>
            <div className="flex-1 h-px bg-[#282828]" />
          </div>
          <div className="bg-[#141414] border border-[#282828] rounded-lg p-4 grid grid-cols-2 gap-4">
            {fields.map(({ key, label, placeholder, required, type }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500">
                  {label} {required && <span className="text-amber-400">*</span>}
                </label>
                <input
                  type={type ?? 'text'}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Dirección de envío */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 whitespace-nowrap">
              2 · Dirección de envío
            </span>
            <div className="flex-1 h-px bg-[#282828]" />
          </div>
          <div className="bg-[#141414] border border-[#282828] rounded-lg p-4 grid grid-cols-2 gap-4">
            {addressFields.map(({ key, label, placeholder, required }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500">
                  {label} {required && <span className="text-amber-400">*</span>}
                </label>
                <input
                  type="text"
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-950 border border-red-900 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creando cliente…' : 'Crear Cliente'}
          </button>
          <Link
            href="/clientes"
            className="px-6 py-2.5 bg-[#1c1c1c] border border-[#333] text-sm font-semibold text-zinc-300 rounded-md hover:border-zinc-500 transition-colors"
          >
            Cancelar
          </Link>
        </div>

        <p className="text-[11px] text-zinc-600">
          Se creará un usuario en Supabase Auth con rol <span className="font-mono">customer</span> y se enviará acceso al cliente.
        </p>
      </div>
    </div>
  );
}
