'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

const PHONE_PREFIXES = [
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+49', flag: '🇩🇪', name: 'Deutschland' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+1',  flag: '🇺🇸', name: 'USA / CA' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+31', flag: '🇳🇱', name: 'Nederland' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Schweiz' },
  { code: '+43', flag: '🇦🇹', name: 'Österreich' },
  { code: '+46', flag: '🇸🇪', name: 'Sverige' },
  { code: '+45', flag: '🇩🇰', name: 'Danmark' },
  { code: '+358', flag: '🇫🇮', name: 'Suomi' },
  { code: '+48', flag: '🇵🇱', name: 'Polska' },
  { code: '+36', flag: '🇭🇺', name: 'Magyar' },
  { code: '+40', flag: '🇷🇴', name: 'România' },
];

const TIPOS_EMPRESA = ['SL', 'SA', 'LLC', 'Ltd', 'GmbH', 'SAS', 'AG', 'Autónomo', 'Otro'];
const TIPOS_FISCAL  = ['NIF/CIF', 'VAT Number', 'EIN', 'Tax ID'];
const TIPOS_CLIENTE = [
  { value: 'distribuidor',  label: 'Distribuidor' },
  { value: 'mayorista',     label: 'Mayorista' },
  { value: 'tienda_fisica', label: 'Tienda física' },
  { value: 'ecommerce',     label: 'E-commerce' },
  { value: 'cadena',        label: 'Cadena' },
  { value: 'marketplace',   label: 'Marketplace' },
];

function parseTelefono(tel?: string) {
  if (!tel) return { prefix: '+34', number: '' };
  for (const p of PHONE_PREFIXES.sort((a, b) => b.code.length - a.code.length)) {
    if (tel.startsWith(p.code)) return { prefix: p.code, number: tel.slice(p.code.length).trim() };
  }
  return { prefix: '+34', number: tel };
}

export default function PerfilPage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [customerId, setCustomerId] = useState('');

  const [form, setForm] = useState({
    // Legal identity
    company_name: '', nombre_comercial: '', tipo_empresa: '',
    tipo_fiscal: 'NIF/CIF', nif_cif: '', numero_eori: '', fecha_constitucion: '',
    // Contact
    contacto_nombre: '', telefono_prefijo: '+34', telefono_numero: '',
    // Fiscal address
    fiscal_street: '', fiscal_city: '', fiscal_state: '', fiscal_postal_code: '', fiscal_country: 'ES',
    // Shipping address
    street: '', city: '', postal_code: '', country: 'ES',
    // Commercial profile
    tipo_cliente: '', zona_distribucion: '', marcas_comercializadas: '', volumen_estimado: '', num_puntos_venta: '',
    // Legal
    acepta_condiciones: false, acepta_privacidad: false,
    consentimiento_comunicaciones: false, declaracion_cumplimiento: false,
  });

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: cust } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!cust) { setLoading(false); return; }
      setCustomerId(cust.id);

      const tel  = parseTelefono(cust.telefono);
      const env  = (cust.direccion_envio as any) ?? {};
      const fisc = (cust.direccion_fiscal as any) ?? {};
      const cl   = (cust.condiciones_legales as any) ?? {};

      setForm({
        company_name:    cust.company_name     ?? '',
        nombre_comercial: cust.nombre_comercial ?? '',
        tipo_empresa:    cust.tipo_empresa      ?? '',
        tipo_fiscal:     cust.tipo_fiscal       ?? 'NIF/CIF',
        nif_cif:         cust.nif_cif           ?? '',
        numero_eori:     cust.numero_eori       ?? '',
        fecha_constitucion: cust.fecha_constitucion ?? '',
        contacto_nombre: cust.contacto_nombre   ?? '',
        telefono_prefijo: tel.prefix,
        telefono_numero:  tel.number,
        fiscal_street:   fisc.street            ?? '',
        fiscal_city:     fisc.city              ?? '',
        fiscal_state:    fisc.state             ?? '',
        fiscal_postal_code: fisc.postal_code    ?? '',
        fiscal_country:  fisc.country           ?? 'ES',
        street:    env.street                   ?? '',
        city:      env.city                     ?? '',
        postal_code: env.postal_code            ?? '',
        country:   env.country                  ?? 'ES',
        tipo_cliente:           cust.tipo_cliente            ?? '',
        zona_distribucion:      cust.zona_distribucion       ?? '',
        marcas_comercializadas: cust.marcas_comercializadas  ?? '',
        volumen_estimado:       cust.volumen_estimado        ?? '',
        num_puntos_venta:       cust.num_puntos_venta ? String(cust.num_puntos_venta) : '',
        acepta_condiciones:             cl.acepta_condiciones            ?? false,
        acepta_privacidad:              cl.acepta_privacidad             ?? false,
        consentimiento_comunicaciones:  cl.consentimiento_comunicaciones ?? false,
        declaracion_cumplimiento:       cl.declaracion_cumplimiento      ?? false,
      });
      setLoading(false);
    }
    load();
  }, []);

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!customerId) return;
    setSaving(true); setError(''); setSuccess('');

    const payload: Record<string, unknown> = {
      company_name:    form.company_name,
      nombre_comercial: form.nombre_comercial || null,
      tipo_empresa:    form.tipo_empresa      || null,
      nif_cif:         form.nif_cif,
      tipo_fiscal:     form.tipo_fiscal,
      numero_eori:     form.numero_eori       || null,
      fecha_constitucion: form.fecha_constitucion || null,
      contacto_nombre: form.contacto_nombre,
      telefono:        `${form.telefono_prefijo} ${form.telefono_numero}`.trim(),
      direccion_fiscal: form.fiscal_street ? {
        street:      form.fiscal_street,
        city:        form.fiscal_city,
        state:       form.fiscal_state  || null,
        postal_code: form.fiscal_postal_code,
        country:     form.fiscal_country,
      } : null,
      direccion_envio: {
        street:      form.street,
        city:        form.city,
        postal_code: form.postal_code,
        country:     form.country,
      },
      tipo_cliente:           form.tipo_cliente            || null,
      zona_distribucion:      form.zona_distribucion       || null,
      marcas_comercializadas: form.marcas_comercializadas  || null,
      volumen_estimado:       form.volumen_estimado        || null,
      num_puntos_venta:       form.num_puntos_venta ? parseInt(form.num_puntos_venta) : null,
      condiciones_legales: {
        acepta_condiciones:             form.acepta_condiciones,
        acepta_privacidad:              form.acepta_privacidad,
        consentimiento_comunicaciones:  form.consentimiento_comunicaciones,
        declaracion_cumplimiento:       form.declaracion_cumplimiento,
      },
    };

    const res = await fetch(`/api/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setSuccess('Perfil actualizado correctamente.');
      setTimeout(() => setSuccess(''), 4000);
    } else {
      const d = await res.json();
      setError(d.error ?? 'Error al guardar');
    }
  }

  const inputCls  = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";
  const selectCls = inputCls;
  const labelCls  = "text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400";
  const req       = <span className="text-[#D93A35]">*</span>;

  function SectionTitle({ n, title }: { n: number; title: string }) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">{n} · {title}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
    );
  }

  if (loading) return (
    <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
      Cargando perfil…
    </div>
  );

  return (
    <div className="p-6 md:p-7 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
            style={{ fontFamily: 'var(--font-alexandria)' }}>Mi Perfil</h1>
        <p className="text-xs text-gray-400 mt-0.5">Información de tu empresa y datos de contacto</p>
      </div>

      <div className="space-y-6">

        {/* ── 1. Datos Jurídicos ─────────────────────────────────────────── */}
        <section>
          <SectionTitle n={1} title="Datos Jurídicos" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className={labelCls}>Razón social {req}</label>
              <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
                placeholder="Distribuciones Fashion SL" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Nombre comercial</label>
              <input type="text" value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)}
                placeholder="Fashion Dist." className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tipo de empresa</label>
              <select value={form.tipo_empresa} onChange={e => set('tipo_empresa', e.target.value)} className={selectCls}>
                <option value="">— Seleccionar —</option>
                {TIPOS_EMPRESA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tipo de identificación fiscal {req}</label>
              <select value={form.tipo_fiscal} onChange={e => set('tipo_fiscal', e.target.value)} className={selectCls}>
                {TIPOS_FISCAL.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Número de identificación fiscal {req}</label>
              <input type="text" value={form.nif_cif} onChange={e => set('nif_cif', e.target.value)}
                placeholder="B12345678" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Número EORI</label>
              <input type="text" value={form.numero_eori} onChange={e => set('numero_eori', e.target.value)}
                placeholder="ES12345678" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Fecha de constitución</label>
              <input type="date" value={form.fecha_constitucion} onChange={e => set('fecha_constitucion', e.target.value)}
                className={inputCls} />
            </div>
          </div>
        </section>

        {/* ── 2. Dirección Fiscal ────────────────────────────────────────── */}
        <section>
          <SectionTitle n={2} title="Dirección Fiscal" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className={labelCls}>Calle y número {req}</label>
              <input type="text" value={form.fiscal_street} onChange={e => set('fiscal_street', e.target.value)}
                placeholder="Gran Vía 14, 3º" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Ciudad {req}</label>
              <input type="text" value={form.fiscal_city} onChange={e => set('fiscal_city', e.target.value)}
                placeholder="Madrid" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Estado / Provincia</label>
              <input type="text" value={form.fiscal_state} onChange={e => set('fiscal_state', e.target.value)}
                placeholder="Madrid" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Código postal {req}</label>
              <input type="text" value={form.fiscal_postal_code} onChange={e => set('fiscal_postal_code', e.target.value)}
                placeholder="28013" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>País {req}</label>
              <input type="text" value={form.fiscal_country} onChange={e => set('fiscal_country', e.target.value)}
                placeholder="ES" className={inputCls} />
            </div>
          </div>
        </section>

        {/* ── 3. Dirección de Envío ──────────────────────────────────────── */}
        <section>
          <SectionTitle n={3} title="Dirección de Envío" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className={labelCls}>Calle y número {req}</label>
              <input type="text" value={form.street} onChange={e => set('street', e.target.value)}
                placeholder="Calle Ejemplo 1" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Ciudad {req}</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="Barcelona" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Código postal {req}</label>
              <input type="text" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}
                placeholder="08001" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>País {req}</label>
              <input type="text" value={form.country} onChange={e => set('country', e.target.value)}
                placeholder="ES" className={inputCls} />
            </div>
          </div>
        </section>

        {/* ── 4. Persona de Contacto ─────────────────────────────────────── */}
        <section>
          <SectionTitle n={4} title="Persona de Contacto" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Nombre completo {req}</label>
              <input type="text" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
                placeholder="Carlos Mendez" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Teléfono {req}</label>
              <div className="flex gap-2">
                <select value={form.telefono_prefijo} onChange={e => set('telefono_prefijo', e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors w-[110px] flex-shrink-0">
                  {PHONE_PREFIXES.map(p => (
                    <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                  ))}
                </select>
                <input type="tel" value={form.telefono_numero} onChange={e => set('telefono_numero', e.target.value)}
                  placeholder="612 345 678" className={inputCls} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Perfil Comercial ────────────────────────────────────────── */}
        <section>
          <SectionTitle n={5} title="Perfil Comercial" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Tipo de cliente</label>
              <select value={form.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)} className={selectCls}>
                <option value="">— Seleccionar —</option>
                {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Número de puntos de venta</label>
              <input type="number" min="0" value={form.num_puntos_venta} onChange={e => set('num_puntos_venta', e.target.value)}
                placeholder="0" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Zona geográfica de distribución</label>
              <input type="text" value={form.zona_distribucion} onChange={e => set('zona_distribucion', e.target.value)}
                placeholder="España, Portugal" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Volumen estimado de compra</label>
              <input type="text" value={form.volumen_estimado} onChange={e => set('volumen_estimado', e.target.value)}
                placeholder="50.000 € / año" className={inputCls} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className={labelCls}>Marcas que comercializa</label>
              <input type="text" value={form.marcas_comercializadas} onChange={e => set('marcas_comercializadas', e.target.value)}
                placeholder="Marca A, Marca B, Marca C" className={inputCls} />
            </div>
          </div>
        </section>

        {/* ── 6. Legal / GDPR ───────────────────────────────────────────── */}
        <section>
          <SectionTitle n={6} title="Legal / GDPR" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            {[
              { key: 'acepta_condiciones',           label: 'Aceptación de condiciones generales de venta',                   required: true  },
              { key: 'acepta_privacidad',             label: 'Aceptación de la política de privacidad (RGPD / GDPR)',           required: true  },
              { key: 'consentimiento_comunicaciones', label: 'Consentimiento para comunicaciones comerciales',                  required: false },
              { key: 'declaracion_cumplimiento',      label: 'Declaración de cumplimiento normativo (import/export si aplica)', required: false },
            ].map(({ key, label, required }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#D93A35] cursor-pointer flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {label} {required && req}
                </span>
              </label>
            ))}
          </div>
        </section>

        {error   && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#D93A35]">{error}</div>}
        {success && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-[#0DA265] font-semibold">{success}</div>}

        <div>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}