'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PHONE_PREFIXES = [
  { code: '+34', flag: '🇪🇸' }, { code: '+33', flag: '🇫🇷' },
  { code: '+49', flag: '🇩🇪' }, { code: '+39', flag: '🇮🇹' },
  { code: '+351', flag: '🇵🇹' }, { code: '+44', flag: '🇬🇧' },
  { code: '+1',  flag: '🇺🇸' }, { code: '+52', flag: '🇲🇽' },
  { code: '+55', flag: '🇧🇷' }, { code: '+31', flag: '🇳🇱' },
  { code: '+32', flag: '🇧🇪' }, { code: '+41', flag: '🇨🇭' },
  { code: '+46', flag: '🇸🇪' }, { code: '+48', flag: '🇵🇱' },
]

const TIPOS_EMPRESA = ['SL', 'SA', 'LLC', 'Ltd', 'GmbH', 'SAS', 'AG', 'Autónomo', 'Otro']
const TIPOS_FISCAL  = ['NIF/CIF', 'VAT Number', 'EIN', 'Tax ID']
const TIPOS_CLIENTE = [
  { value: 'distribuidor',  label: 'Distributor' },
  { value: 'mayorista',     label: 'Wholesaler' },
  { value: 'tienda_fisica', label: 'Physical Store' },
  { value: 'ecommerce',     label: 'E-commerce' },
  { value: 'cadena',        label: 'Chain' },
  { value: 'marketplace',   label: 'Marketplace' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [name, setName]       = useState('')

  const [form, setForm] = useState({
    contacto_nombre: '', telefono_prefix: '+34', telefono_number: '',
    company_name: '', nombre_comercial: '', tipo_empresa: '',
    tipo_fiscal: 'NIF/CIF', nif_cif: '', numero_eori: '', fecha_constitucion: '',
    fiscal_street: '', fiscal_city: '', fiscal_state: '', fiscal_postal_code: '', fiscal_country: 'ES',
    same_address: true,
    street: '', city: '', postal_code: '', country: 'ES',
    tipo_cliente: '', zona_distribucion: '', marcas_comercializadas: '',
    volumen_estimado: '', num_puntos_venta: '',
  })

  function set(key: string, value: string | boolean) {
    setForm(p => ({ ...p, [key]: value }))
  }

  useEffect(() => {
    fetch('/api/portal/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.onboarding_completed) { router.replace('/portal'); return }
        setName(data.contacto_nombre ?? '')
        const addr   = data.direccion_envio  ?? {}
        const fiscal = data.direccion_fiscal ?? {}
        setForm(p => ({
          ...p,
          contacto_nombre:    data.contacto_nombre    ?? '',
          company_name:       data.company_name       ?? '',
          nombre_comercial:   data.nombre_comercial   ?? '',
          tipo_empresa:       data.tipo_empresa       ?? '',
          tipo_fiscal:        data.tipo_fiscal        ?? 'NIF/CIF',
          nif_cif:            data.nif_cif            ?? '',
          numero_eori:        data.numero_eori        ?? '',
          fecha_constitucion: data.fecha_constitucion ?? '',
          fiscal_street:      fiscal.street           ?? '',
          fiscal_city:        fiscal.city             ?? '',
          fiscal_state:       fiscal.state            ?? '',
          fiscal_postal_code: fiscal.postal_code      ?? '',
          fiscal_country:     fiscal.country          ?? 'ES',
          street:             addr.street             ?? '',
          city:               addr.city               ?? '',
          postal_code:        addr.postal_code        ?? '',
          country:            addr.country            ?? 'ES',
          tipo_cliente:           data.tipo_cliente           ?? '',
          zona_distribucion:      data.zona_distribucion      ?? '',
          marcas_comercializadas: data.marcas_comercializadas ?? '',
          volumen_estimado:       data.volumen_estimado       ?? '',
          num_puntos_venta:       data.num_puntos_venta ? String(data.num_puntos_venta) : '',
        }))
      })
  }, [router])

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.contacto_nombre.trim()) return 'Contact name is required'
      if (!form.company_name.trim())    return 'Company name is required'
      if (!form.nif_cif.trim())         return 'Tax ID is required'
    }
    if (step === 2) {
      if (!form.fiscal_street.trim())      return 'Fiscal street is required'
      if (!form.fiscal_city.trim())        return 'Fiscal city is required'
      if (!form.fiscal_postal_code.trim()) return 'Fiscal postal code is required'
      if (!form.fiscal_country.trim())     return 'Fiscal country is required'
      if (!form.same_address) {
        if (!form.street.trim())      return 'Shipping street is required'
        if (!form.city.trim())        return 'Shipping city is required'
        if (!form.postal_code.trim()) return 'Shipping postal code is required'
        if (!form.country.trim())     return 'Shipping country is required'
      }
    }
    return null
  }

  function nextStep() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  async function submit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/portal/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacto_nombre:    form.contacto_nombre.trim(),
        telefono:           `${form.telefono_prefix} ${form.telefono_number}`.trim(),
        company_name:       form.company_name.trim(),
        nombre_comercial:   form.nombre_comercial  || null,
        tipo_empresa:       form.tipo_empresa       || null,
        tipo_fiscal:        form.tipo_fiscal,
        nif_cif:            form.nif_cif.trim(),
        numero_eori:        form.numero_eori        || null,
        fecha_constitucion: form.fecha_constitucion || null,
        fiscal_street:      form.fiscal_street,
        fiscal_city:        form.fiscal_city,
        fiscal_state:       form.fiscal_state       || '',
        fiscal_postal_code: form.fiscal_postal_code,
        fiscal_country:     form.fiscal_country,
        same_address:       form.same_address,
        street:             form.street,
        city:               form.city,
        postal_code:        form.postal_code,
        country:            form.country,
        tipo_cliente:           form.tipo_cliente           || null,
        zona_distribucion:      form.zona_distribucion      || null,
        marcas_comercializadas: form.marcas_comercializadas || null,
        volumen_estimado:       form.volumen_estimado       || null,
        num_puntos_venta:       form.num_puntos_venta       || null,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
      return
    }
    setStep(4)
  }

  const inputCls  = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] focus:ring-1 focus:ring-[#D93A35]/20 outline-none transition-all"
  const selectCls = inputCls
  const labelCls  = "block text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400 mb-1.5"
  const req       = <span className="text-[#D93A35]">*</span>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-black tracking-widest uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Firma Rollers B2B</span>
        {step > 0 && step < 4 && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1 w-10 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#D93A35]' : 'bg-gray-200'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-mono">Step {step} of 3</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">

          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#D93A35] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D93A35]/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-3"
                  style={{ fontFamily: 'var(--font-alexandria)' }}>
                Welcome{name ? `, ${name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-gray-500 text-base mb-2 max-w-sm mx-auto">
                Your account is ready. Before placing orders, we need a few details about your business.
              </p>
              <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">This takes about 2 minutes.</p>
              <button onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#D93A35] text-white font-bold rounded-xl hover:bg-[#b52e2a] transition-colors shadow-lg shadow-[#D93A35]/20 text-sm">
                Get started
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <div className="mt-10 grid grid-cols-3 gap-3 text-center">
                {[['01','Company details'],['02','Your address'],['03','Business profile']].map(([n,label]) => (
                  <div key={n} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-[10px] font-black tracking-[0.2em] text-[#D93A35] mb-1">{n}</div>
                    <div className="text-xs text-gray-500 font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Company */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Company details</h2>
                <p className="text-sm text-gray-400">Legal and contact information for your business.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Legal company name {req}</label>
                    <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
                      placeholder="Distribuciones Fashion SL" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Trade name</label>
                    <input type="text" value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)}
                      placeholder="Fashion Dist." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Company type</label>
                    <select value={form.tipo_empresa} onChange={e => set('tipo_empresa', e.target.value)} className={selectCls}>
                      <option value="">— Select —</option>
                      {TIPOS_EMPRESA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tax ID type {req}</label>
                    <select value={form.tipo_fiscal} onChange={e => set('tipo_fiscal', e.target.value)} className={selectCls}>
                      {TIPOS_FISCAL.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tax ID number {req}</label>
                    <input type="text" value={form.nif_cif} onChange={e => set('nif_cif', e.target.value)}
                      placeholder="B12345678" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>EORI number</label>
                    <input type="text" value={form.numero_eori} onChange={e => set('numero_eori', e.target.value)}
                      placeholder="ES12345678" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Incorporation date</label>
                    <input type="date" value={form.fecha_constitucion} onChange={e => set('fecha_constitucion', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Contact name {req}</label>
                    <input type="text" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
                      placeholder="Carlos Mendez" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Phone</label>
                    <div className="flex gap-2">
                      <select value={form.telefono_prefix} onChange={e => set('telefono_prefix', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-2.5 text-sm text-gray-900 focus:border-[#D93A35] outline-none w-[90px] flex-shrink-0">
                        {PHONE_PREFIXES.map(p => <option key={p.code} value={p.code}>{p.flag} {p.code}</option>)}
                      </select>
                      <input type="tel" value={form.telefono_number} onChange={e => set('telefono_number', e.target.value)}
                        placeholder="612 345 678" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Address */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Your address</h2>
                <p className="text-sm text-gray-400">Fiscal and shipping addresses for your orders.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-400 mb-4">Fiscal address</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Street {req}</label>
                      <input type="text" value={form.fiscal_street} onChange={e => set('fiscal_street', e.target.value)}
                        placeholder="Gran Vía 14, 3º" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>City {req}</label>
                      <input type="text" value={form.fiscal_city} onChange={e => set('fiscal_city', e.target.value)}
                        placeholder="Madrid" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>State / Region</label>
                      <input type="text" value={form.fiscal_state} onChange={e => set('fiscal_state', e.target.value)}
                        placeholder="Madrid" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Postal code {req}</label>
                      <input type="text" value={form.fiscal_postal_code} onChange={e => set('fiscal_postal_code', e.target.value)}
                        placeholder="28013" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Country {req}</label>
                      <input type="text" value={form.fiscal_country} onChange={e => set('fiscal_country', e.target.value)}
                        placeholder="ES" className={inputCls} />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-400">Shipping address</div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={form.same_address} onChange={e => set('same_address', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#D93A35] cursor-pointer" />
                      <span className="text-xs text-gray-500">Same as fiscal</span>
                    </label>
                  </div>
                  {form.same_address ? (
                    <p className="text-sm text-gray-400 italic">Using fiscal address for shipments.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Street {req}</label>
                        <input type="text" value={form.street} onChange={e => set('street', e.target.value)}
                          placeholder="Calle Ejemplo 1" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>City {req}</label>
                        <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                          placeholder="Barcelona" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Postal code {req}</label>
                        <input type="text" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}
                          placeholder="08001" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Country {req}</label>
                        <input type="text" value={form.country} onChange={e => set('country', e.target.value)}
                          placeholder="ES" className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Business profile */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1"
                    style={{ fontFamily: 'var(--font-alexandria)' }}>Business profile</h2>
                <p className="text-sm text-gray-400">Help us understand your business. All fields are optional.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Customer type</label>
                    <select value={form.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)} className={selectCls}>
                      <option value="">— Select —</option>
                      {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Number of sales points</label>
                    <input type="number" min="0" value={form.num_puntos_venta} onChange={e => set('num_puntos_venta', e.target.value)}
                      placeholder="0" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Distribution area</label>
                    <input type="text" value={form.zona_distribucion} onChange={e => set('zona_distribucion', e.target.value)}
                      placeholder="Spain, Portugal, France" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Estimated annual purchase volume</label>
                    <input type="text" value={form.volumen_estimado} onChange={e => set('volumen_estimado', e.target.value)}
                      placeholder="€50,000 / year" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Brands you carry</label>
                    <input type="text" value={form.marcas_comercializadas} onChange={e => set('marcas_comercializadas', e.target.value)}
                      placeholder="Brand A, Brand B" className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-3"
                  style={{ fontFamily: 'var(--font-alexandria)' }}>You're all set!</h2>
              <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto">
                Your profile is complete. You can now browse the catalogue and place orders.
              </p>
              <button onClick={() => router.replace('/portal')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#D93A35] text-white font-bold rounded-xl hover:bg-[#b52e2a] transition-colors shadow-lg shadow-[#D93A35]/20 text-sm">
                Go to my portal
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#D93A35]">{error}</div>
          )}

          {step > 0 && step < 4 && (
            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => { setError(''); setStep(s => s - 1) }}
                className="px-5 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-500 rounded-xl hover:border-gray-300 transition-colors">
                ← Back
              </button>
              {step < 3 ? (
                <button onClick={nextStep}
                  className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-xl hover:bg-[#b52e2a] transition-colors">
                  Continue →
                </button>
              ) : (
                <button onClick={submit} disabled={loading}
                  className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-xl hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                  {loading ? 'Saving…' : 'Complete setup'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
ENDOFFILE