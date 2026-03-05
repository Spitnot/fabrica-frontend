'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendEmail } from '@/lib/emailService'; // NEW IMPORT

interface Tarifa { id: string; nombre: string; descripcion?: string; }

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
  { code: '+420', flag: '🇨🇿', name: 'Česko' },
  { code: '+36', flag: '🇭🇺', name: 'Magyar' },
  { code: '+40', flag: '🇷🇴', name: 'România' },
];

const TIPOS_EMPRESA = ['SL', 'SA', 'LLC', 'Ltd', 'GmbH', 'SAS', 'AG', 'Autónomo', 'Otro'];
const TIPOS_FISCAL = ['NIF/CIF', 'VAT Number', 'EIN', 'Tax ID'];
const TIPOS_CLIENTE = [
  { value: 'distribuidor',  label: 'Distribuidor' },
  { value: 'mayorista',     label: 'Mayorista' },
  { value: 'tienda_fisica', label: 'Tienda física' },
  { value: 'ecommerce',     label: 'E-commerce' },
  { value: 'cadena',        label: 'Cadena' },
  { value: 'marketplace',   label: 'Marketplace' },
];
const FORMAS_PAGO = [
  { value: 'transferencia',   label: 'Transferencia bancaria' },
  { value: 'sepa',            label: 'SEPA (domiciliación)' },
  { value: 'carta_credito',   label: 'Carta de crédito' },
  { value: 'pago_anticipado', label: 'Pago anticipado' },
];
const CONDICIONES_PAGO = [
  { value: 'prepago', label: 'Prepago' },
  { value: '30dias',  label: '30 días' },
  { value: '60dias',  label: '60 días' },
  { value: '90dias',  label: '90 días' },
];

export default function NuevoClientePage() {
  const router   = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [tarifas, setTarifas]   = useState<Tarifa[]>([]);
  const [sameAddress, setSameAddress] = useState(true);

  const [form, setForm] = useState({
    // Legal identity
    company_name: '', nombre_comercial: '', tipo_empresa: '',
    tipo_fiscal: 'NIF/CIF', nif_cif: '', numero_eori: '', fecha_constitucion: '',
    // Contact
    contacto_nombre: '', email: '', password: '',
    telefono_prefijo: '+34', telefono_numero: '',
    // Fiscal address
    fiscal_street: '', fiscal_city: '', fiscal_state: '', fiscal_postal_code: '', fiscal_country: 'ES',
    // Shipping address
    street: '', city: '', postal_code: '', country: 'ES',
    // Commercial profile
    tipo_cliente: '', zona_distribucion: '', marcas_comercializadas: '', volumen_estimado: '', num_puntos_venta: '',
    // Legal
    acepta_condiciones: false, acepta_privacidad: false,
    consentimiento_comunicaciones: false, declaracion_cumplimiento: false,
    // Internal
    tarifa_id: '', descuento_pct: '0', forma_pago: '', condiciones_pago: '', notas_especiales: '',
  });

  useEffect(() => {
    fetch('/api/tarifas')
      .then(r => r.json())
      .then(d => {
        const list: Tarifa[] = d.data ?? [];
        setTarifas(list);
        const wholesale = list.find(t => t.nombre.toLowerCase() === 'wholesale');
        if (wholesale) setForm(p => ({ ...p, tarifa_id: wholesale.id }));
      });
  }, []);

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.acepta_condiciones || !form.acepta_privacidad) {
      setError('Debes aceptar las condiciones generales y la política de privacidad.');
      return;
    }
    setError(''); setLoading(true);

    const fiscalAddress = sameAddress
      ? { street: form.street, city: form.city, state: '', postal_code: form.postal_code, country: form.country }
      : { street: form.fiscal_street, city: form.fiscal_city, state: form.fiscal_state, postal_code: form.fiscal_postal_code, country: form.fiscal_country };

    const payload = {
      // Contact & auth
      contacto_nombre: form.contacto_nombre,
      company_name:    form.company_name,
      email:           form.email,
      password:        form.password,
      telefono:        `${form.telefono_prefijo} ${form.telefono_numero}`.trim(),
      // Legal identity
      nombre_comercial:   form.nombre_comercial   || null,
      tipo_empresa:       form.tipo_empresa        || null,
      nif_cif:            form.nif_cif,
      tipo_fiscal:        form.tipo_fiscal,
      numero_eori:        form.numero_eori         || null,
      fecha_constitucion: form.fecha_constitucion  || null,
      // Fiscal address
      fiscal_street:      fiscalAddress.street,
      fiscal_city:        fiscalAddress.city,
      fiscal_state:       fiscalAddress.state      || null,
      fiscal_postal_code: fiscalAddress.postal_code,
      fiscal_country:     fiscalAddress.country,
      // Shipping address (copy from fiscal when sameAddress)
      street:       sameAddress ? form.fiscal_street      : form.street,
      city:         sameAddress ? form.fiscal_city        : form.city,
      postal_code:  sameAddress ? form.fiscal_postal_code : form.postal_code,
      country:      sameAddress ? form.fiscal_country     : form.country,
      // Commercial profile
      tipo_cliente:           form.tipo_cliente            || null,
      zona_distribucion:      form.zona_distribucion       || null,
      marcas_comercializadas: form.marcas_comercializadas  || null,
      volumen_estimado:       form.volumen_estimado        || null,
      num_puntos_venta:       form.num_puntos_venta ? parseInt(form.num_puntos_venta) : null,
      // Legal
      condiciones_legales: {
        acepta_condiciones:             form.acepta_condiciones,
        acepta_privacidad:              form.acepta_privacidad,
        consentimiento_comunicaciones:  form.consentimiento_comunicaciones,
        declaracion_cumplimiento:       form.declaracion_cumplimiento,
      },
      // Internal
      tarifa_id:     form.tarifa_id     || null,
      descuento_pct: parseFloat(form.descuento_pct) || 0,
      condiciones_comerciales: {
        forma_pago:        form.forma_pago       || null,
        condiciones_pago:  form.condiciones_pago || null,
        notas_especiales:  form.notas_especiales || null,
      },
    };

    try {
      const res  = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear cliente');

      // SEND WELCOME EMAIL
      const welcomeHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #D93A35;">Welcome to Fabrica B2B</h2>
          <p>Hello ${form.contacto_nombre},</p>
          <p>Your account for <strong>${form.company_name}</strong> has been created.</p>
          <p>You can now access the client portal to view orders, invoices, and pricing.</p>
          <p><strong>Your login credentials:</strong><br/>
          Email: ${form.email}<br/>
          Password: (the one set during creation)</p>
          <a href="https://your-domain.com/portal" style="display: inline-block; padding: 12px 24px; background-color: #D93A35; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
            Access Portal
          </a>
        </div>
      `;
      
      await sendEmail(form.email, 'Welcome to Fabrica B2B', welcomeHtml);

      router.push(`/clientes/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";
  const selectCls = inputCls;
  const labelCls  = "text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400";
  const req       = <span className="text-[#D93A35]">*</span>;

  function Section({ n, title }: { n: number; title: string }) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">{n} · {title}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7 max-w-3xl">
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
        <Link href="/clientes" className="hover:text-gray-600 transition-colors">← Clientes</Link>
        <span>/</span>
        <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
            style={{ fontFamily: 'var(--font-alexandria)' }}>Nuevo Cliente</h1>
      </div>

      <div className="space-y-6">

        {/* ── 1. Datos Jurídicos ─────────────────────────────────────────── */}
        <section>
          <Section n={1} title="Datos Jurídicos" />
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
          <Section n={2} title="Dirección Fiscal" />
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
          <Section n={3} title="Dirección de Envío" />
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#D93A35] cursor-pointer"
              />
              <span className="text-sm text-gray-600">Igual a la dirección fiscal</span>
            </label>
            {!sameAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            )}
          </div>
        </section>

        {/* ── 4. Persona de Contacto ─────────────────────────────────────── */}
        <section>
          <Section n={4} title="Persona de Contacto" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Nombre completo {req}</label>
              <input type="text" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
                placeholder="Carlos Mendez" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Email {req}</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="carlos@empresa.com" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Contraseña inicial {req}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="••••••••" className={inputCls} />
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
          <Section n={5} title="Perfil Comercial" />
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
          <Section n={6} title="Legal / GDPR" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            {[
              { key: 'acepta_condiciones',            label: 'Aceptación de condiciones generales de venta',                  required: true  },
              { key: 'acepta_privacidad',              label: 'Aceptación de la política de privacidad (RGPD / GDPR)',          required: true  },
              { key: 'consentimiento_comunicaciones',  label: 'Consentimiento para comunicaciones comerciales',                 required: false },
              { key: 'declaracion_cumplimiento',       label: 'Declaración de cumplimiento normativo (import/export si aplica)', required: false },
            ].map(({ key, label, required }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={e => set(key, e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#D93A35] cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  {label} {required && req}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── 7. Condiciones Comerciales (interno) ──────────────────────── */}
        <section>
          <Section n={7} title="Condiciones Comerciales — Interno" />
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Lista de precios {req}</label>
              <select value={form.tarifa_id} onChange={e => set('tarifa_id', e.target.value)} className={selectCls}>
                <option value="">— Sin tarifa —</option>
                {tarifas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.descripcion ? ` — ${t.descripcion}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Descuento acordado (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.descuento_pct}
                onChange={e => set('descuento_pct', e.target.value)} placeholder="0" className={inputCls} />
              <p className="text-[10px] text-gray-400">Aplicado sobre la tarifa. 0 = sin descuento adicional.</p>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Forma de pago</label>
              <div className="grid grid-cols-1 gap-2">
                {FORMAS_PAGO.map(fp => (
                  <label key={fp.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="forma_pago" value={fp.value}
                      checked={form.forma_pago === fp.value}
                      onChange={() => set('forma_pago', fp.value)}
                      className="text-[#D93A35]" />
                    <span className="text-sm text-gray-700">{fp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Condiciones de pago</label>
              <div className="grid grid-cols-1 gap-2">
                {CONDICIONES_PAGO.map(cp => (
                  <label key={cp.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="condiciones_pago" value={cp.value}
                      checked={form.condiciones_pago === cp.value}
                      onChange={() => set('condiciones_pago', cp.value)}
                      className="text-[#D93A35]" />
                    <span className="text-sm text-gray-700">{cp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className={labelCls}>Condiciones comerciales especiales</label>
              <textarea value={form.notas_especiales} onChange={e => set('notas_especiales', e.target.value)}
                rows={3} placeholder="Notas internas, condiciones negociadas, excepciones…"
                className={inputCls + ' resize-none'} />
            </div>
          </div>
        </section>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#D93A35]">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creando cliente…' : 'Crear Cliente'}
          </button>
          <Link href="/clientes"
            className="px-6 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}