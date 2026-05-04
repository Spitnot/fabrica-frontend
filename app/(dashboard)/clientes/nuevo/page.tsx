'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    company_name: '', nombre_comercial: '', tipo_empresa: '',
    tipo_fiscal: 'NIF/CIF', nif_cif: '', numero_eori: '', fecha_constitucion: '',
    contacto_nombre: '', email: '',
    telefono_prefijo: '+34', telefono_numero: '',
    fiscal_street: '', fiscal_city: '', fiscal_state: '', fiscal_postal_code: '', fiscal_country: 'ES',
    street: '', city: '', postal_code: '', country: 'ES',
    tipo_cliente: '', zona_distribucion: '', marcas_comercializadas: '', volumen_estimado: '', num_puntos_venta: '',
    acepta_condiciones: false, acepta_privacidad: false,
    consentimiento_comunicaciones: false, declaracion_cumplimiento: false,
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
    // ── Validación de campos obligatorios ──────────────────────────────────
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const required: [string, string][] = [
      [form.company_name,        'Razón social es obligatoria'],
      [form.nif_cif,             'Número de identificación fiscal es obligatorio'],
      [form.fiscal_street,       'Calle y número (dirección fiscal) es obligatorio'],
      [form.fiscal_city,         'Ciudad (dirección fiscal) es obligatoria'],
      [form.fiscal_postal_code,  'Código postal (dirección fiscal) es obligatorio'],
      [form.fiscal_country,      'País (dirección fiscal) es obligatorio'],
      [form.contacto_nombre,     'Nombre de contacto es obligatorio'],
      [form.email,               'Email es obligatorio'],
      [form.telefono_numero,     'Teléfono es obligatorio'],
    ];
    for (const [value, msg] of required) {
      if (!value?.trim()) { setError(msg); return; }
    }
    if (!emailRe.test(form.email)) {
      setError('El email no tiene un formato válido (ej: nombre@empresa.com)'); return;
    }
    if (!sameAddress) {
      if (!form.street?.trim())       { setError('Calle y número (dirección de envío) es obligatorio'); return; }
      if (!form.city?.trim())         { setError('Ciudad (dirección de envío) es obligatoria'); return; }
      if (!form.postal_code?.trim())  { setError('Código postal (dirección de envío) es obligatorio'); return; }
      if (!form.country?.trim())      { setError('País (dirección de envío) es obligatorio'); return; }
    }
    if (!form.acepta_condiciones || !form.acepta_privacidad) {
      setError('Debes aceptar las condiciones generales y la política de privacidad.');
      return;
    }
    setError(''); setLoading(true);

    const fiscalAddress = sameAddress
      ? { street: form.street, city: form.city, state: '', postal_code: form.postal_code, country: form.country }
      : { street: form.fiscal_street, city: form.fiscal_city, state: form.fiscal_state, postal_code: form.fiscal_postal_code, country: form.fiscal_country };

    const payload = {
      contacto_nombre: form.contacto_nombre,
      company_name:    form.company_name,
      email:           form.email,
      telefono:        `${form.telefono_prefijo} ${form.telefono_numero}`.trim(),
      nombre_comercial:   form.nombre_comercial   || null,
      tipo_empresa:       form.tipo_empresa        || null,
      nif_cif:            form.nif_cif,
      tipo_fiscal:        form.tipo_fiscal,
      numero_eori:        form.numero_eori         || null,
      fecha_constitucion: form.fecha_constitucion  || null,
      fiscal_street:      fiscalAddress.street,
      fiscal_city:        fiscalAddress.city,
      fiscal_state:       fiscalAddress.state      || null,
      fiscal_postal_code: fiscalAddress.postal_code,
      fiscal_country:     fiscalAddress.country,
      street:       sameAddress ? form.fiscal_street      : form.street,
      city:         sameAddress ? form.fiscal_city        : form.city,
      postal_code:  sameAddress ? form.fiscal_postal_code : form.postal_code,
      country:      sameAddress ? form.fiscal_country     : form.country,
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

      // El email de bienvenida lo envía el servidor en /api/customers
      router.push(`/clientes/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }




  const req       = <span >*</span>;

  function Section({ n, title }: { n: number; title: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span className="fr-label" style={{ whiteSpace: "nowrap" }}>{n} · {title}</span>
        <div style={{ flex: 1, height: 1, background: "#111" }} />
      </div>
    );
  }

  return (
    <div className="fr-page" style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <Link href="/clientes" href="/clientes" className="fr-label">← Clientes</Link>
        <span>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}
            style={{ fontFamily: 'var(--font-alexandria)' }}>Nuevo Cliente</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── 1. Datos Jurídicos ─────────────────────────────────────────── */}
        <section>
          <Section n={1} title="Datos Jurídicos" />
          <div className="fr-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Razón social {req}</label>
              <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
                placeholder="Distribuciones Fashion SL" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Nombre comercial</label>
              <input type="text" value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)}
                placeholder="Fashion Dist." />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Tipo de empresa</label>
              <select value={form.tipo_empresa} onChange={e => set('tipo_empresa', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {TIPOS_EMPRESA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Tipo de identificación fiscal {req}</label>
              <select value={form.tipo_fiscal} onChange={e => set('tipo_fiscal', e.target.value)}>
                {TIPOS_FISCAL.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Número de identificación fiscal {req}</label>
              <input type="text" value={form.nif_cif} onChange={e => set('nif_cif', e.target.value)}
                placeholder="B12345678" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Número EORI</label>
              <input type="text" value={form.numero_eori} onChange={e => set('numero_eori', e.target.value)}
                placeholder="ES12345678" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Fecha de constitución</label>
              <input type="date" value={form.fecha_constitucion} onChange={e => set('fecha_constitucion', e.target.value)}
                />
            </div>
          </div>
        </section>

        {/* ── 2. Dirección Fiscal ────────────────────────────────────────── */}
        <section>
          <Section n={2} title="Dirección Fiscal" />
          <div className="fr-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Calle y número {req}</label>
              <input type="text" value={form.fiscal_street} onChange={e => set('fiscal_street', e.target.value)}
                placeholder="Gran Vía 14, 3º" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Ciudad {req}</label>
              <input type="text" value={form.fiscal_city} onChange={e => set('fiscal_city', e.target.value)}
                placeholder="Madrid" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Estado / Provincia</label>
              <input type="text" value={form.fiscal_state} onChange={e => set('fiscal_state', e.target.value)}
                placeholder="Madrid" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Código postal {req}</label>
              <input type="text" value={form.fiscal_postal_code} onChange={e => set('fiscal_postal_code', e.target.value)}
                placeholder="28013" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">País {req}</label>
              <input type="text" value={form.fiscal_country} onChange={e => set('fiscal_country', e.target.value)}
                placeholder="ES" />
            </div>
          </div>
        </section>

        {/* ── 3. Dirección de Envío ──────────────────────────────────────── */}
        <section>
          <Section n={3} title="Dirección de Envío" />
          <div className="fr-card" style={{ padding: 16 }}>
            <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)}
                
              />
              <span style={{ fontSize: 13 }}>Igual a la dirección fiscal</span>
            </label>
            {!sameAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="fr-label">Calle y número {req}</label>
                  <input type="text" value={form.street} onChange={e => set('street', e.target.value)}
                    placeholder="Calle Ejemplo 1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="fr-label">Ciudad {req}</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Barcelona" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="fr-label">Código postal {req}</label>
                  <input type="text" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}
                    placeholder="08001" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="fr-label">País {req}</label>
                  <input type="text" value={form.country} onChange={e => set('country', e.target.value)}
                    placeholder="ES" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 4. Persona de Contacto ─────────────────────────────────────── */}
        <section>
          <Section n={4} title="Persona de Contacto" />
          <div className="fr-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Nombre completo {req}</label>
              <input type="text" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
                placeholder="Carlos Mendez" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Email {req}</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="carlos@empresa.com" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Teléfono {req}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={form.telefono_prefijo} onChange={e => set('telefono_prefijo', e.target.value)}
                  style={{ width: 110, flexShrink: 0 }}>
                  {PHONE_PREFIXES.map(p => (
                    <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                  ))}
                </select>
                <input type="tel" value={form.telefono_numero} onChange={e => set('telefono_numero', e.target.value)}
                  placeholder="612 345 678" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Perfil Comercial ────────────────────────────────────────── */}
        <section>
          <Section n={5} title="Perfil Comercial" />
          <div className="fr-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Tipo de cliente</label>
              <select value={form.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Número de puntos de venta</label>
              <input type="number" min="0" value={form.num_puntos_venta} onChange={e => set('num_puntos_venta', e.target.value)}
                placeholder="0" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Zona geográfica de distribución</label>
              <input type="text" value={form.zona_distribucion} onChange={e => set('zona_distribucion', e.target.value)}
                placeholder="España, Portugal" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Volumen estimado de compra</label>
              <input type="text" value={form.volumen_estimado} onChange={e => set('volumen_estimado', e.target.value)}
                placeholder="50.000 € / año" />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Marcas que comercializa</label>
              <input type="text" value={form.marcas_comercializadas} onChange={e => set('marcas_comercializadas', e.target.value)}
                placeholder="Marca A, Marca B, Marca C" />
            </div>
          </div>
        </section>

        {/* ── 6. Legal / GDPR ───────────────────────────────────────────── */}
        <section>
          <Section n={6} title="Legal / GDPR" />
          <div className="fr-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: 'acepta_condiciones',            label: 'Aceptación de condiciones generales de venta',                   required: true  },
              { key: 'acepta_privacidad',              label: 'Aceptación de la política de privacidad (RGPD / GDPR)',           required: true  },
              { key: 'consentimiento_comunicaciones',  label: 'Consentimiento para comunicaciones comerciales',                  required: false },
              { key: 'declaracion_cumplimiento',       label: 'Declaración de cumplimiento normativo (import/export si aplica)', required: false },
            ].map(({ key, label, required }) => (
              <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={e => set(key, e.target.checked)}
                  
                />
                <span style={{ fontSize: 13 }}>
                  {label} {required && req}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── 7. Condiciones Comerciales (interno) ──────────────────────── */}
        <section>
          <Section n={7} title="Condiciones Comerciales — Interno" />
          <div className="fr-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Lista de precios {req}</label>
              <select value={form.tarifa_id} onChange={e => set('tarifa_id', e.target.value)}>
                <option value="">— Sin tarifa —</option>
                {tarifas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.descripcion ? ` — ${t.descripcion}` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Descuento acordado (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.descuento_pct}
                onChange={e => set('descuento_pct', e.target.value)} placeholder="0" />
              <p className="fr-label">Aplicado sobre la tarifa. 0 = sin descuento adicional.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="fr-label">Forma de pago</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FORMAS_PAGO.map(fp => (
                  <label key={fp.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="radio" name="forma_pago" value={fp.value}
                      checked={form.forma_pago === fp.value}
                      onChange={() => set('forma_pago', fp.value)}
                       />
                    <span style={{ fontSize: 13 }}>{fp.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="fr-label">Condiciones de pago</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CONDICIONES_PAGO.map(cp => (
                  <label key={cp.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="radio" name="condiciones_pago" value={cp.value}
                      checked={form.condiciones_pago === cp.value}
                      onChange={() => set('condiciones_pago', cp.value)}
                       />
                    <span style={{ fontSize: 13 }}>{cp.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="fr-label">Condiciones comerciales especiales</label>
              <textarea value={form.notas_especiales} onChange={e => set('notas_especiales', e.target.value)}
                rows={3} placeholder="Notas internas, condiciones negociadas, excepciones…" />
            </div>
          </div>
        </section>

        {error && (
          <div style={{ padding: "10px 14px", border: "1px solid #D93A35", fontFamily: "var(--font-mono)", fontSize: 11, color: "#D93A35" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary">
            {loading ? 'Creando cliente…' : 'Crear Cliente'}
          </button>
          <Link href="/clientes"
            className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}