'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────

interface CompanySettings {
  id: string
  razon_social: string; nombre_comercial: string; nif: string; eori: string
  direccion: string; ciudad: string; cp: string; provincia: string; pais: string
  telefono: string; email_fiscal: string; web: string
  serie_default: string; siguiente_numero: number; iva_default: number
  pie_factura: string; payment_terms: string
  iban: string; bic: string; titular_cuenta: string; banco: string
  logo_url: string; color_primario: string
  incoterm_default: string; packlink_api_key: string
  dhl_account_number: string; dhl_api_key: string; dhl_api_secret: string
  adr_contact_name: string; adr_contact_phone: string; adr_contact_email: string
  gdrive_folder_id: string
}

const EMPTY: CompanySettings = {
  id: '',
  razon_social: '', nombre_comercial: '', nif: '', eori: '',
  direccion: '', ciudad: '', cp: '', provincia: '', pais: 'ES',
  telefono: '', email_fiscal: '', web: '',
  serie_default: 'FR', siguiente_numero: 1, iva_default: 21,
  pie_factura: '', payment_terms: '30 días',
  iban: '', bic: '', titular_cuenta: '', banco: '',
  logo_url: '', color_primario: '#D93A35',
  incoterm_default: 'DAP', packlink_api_key: '',
  dhl_account_number: '', dhl_api_key: '', dhl_api_secret: '',
  adr_contact_name: '', adr_contact_phone: '', adr_contact_email: '',
  gdrive_folder_id: '',
}

const TABS = ['Fiscal', 'Facturación', 'Bancarios', 'Envíos', 'Branding', 'Drive'] as const
type Tab = typeof TABS[number]

// ─── Shared input styles (same as clientes/nuevo) ─────────

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors"
const monoCls  = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors"
const labelCls = "text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400"

// ─── Shared components ────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder = '', mono = false, required = false }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; mono?: boolean; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}{required && <span className="text-[#D93A35] ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className={mono ? monoCls : inputCls} />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder = '', rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        className={inputCls + ' resize-y'} />
    </div>
  )
}

function SectionDivider({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-2 mt-2">
      <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">{n} · {title}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      {children}
    </div>
  )
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="px-6 py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {saving ? 'Saving…' : 'Save Changes'}
    </button>
  )
}

// ─── Tab panels ───────────────────────────────────────────

function FiscalTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="Identidad legal" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Razón social" value={s.razon_social} onChange={v => set('razon_social', v)} placeholder="Firma Rollers SL" required />
          </div>
          <Field label="Nombre comercial" value={s.nombre_comercial} onChange={v => set('nombre_comercial', v)} placeholder="Firma Rollers" />
          <Field label="NIF / CIF" value={s.nif} onChange={v => set('nif', v.toUpperCase())} placeholder="B12345678" mono required />
          <Field label="Número EORI" value={s.eori} onChange={v => set('eori', v.toUpperCase())} placeholder="ES12345678901234" mono />
          <Field label="Web" value={s.web} onChange={v => set('web', v)} placeholder="https://firmarollers.com" />
        </div>
      </Card>

      <SectionDivider n={2} title="Dirección fiscal" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Calle y número" value={s.direccion} onChange={v => set('direccion', v)} placeholder="Calle Ejemplo 1, 2º" />
          </div>
          <Field label="CP" value={s.cp} onChange={v => set('cp', v)} placeholder="08001" />
          <Field label="Ciudad" value={s.ciudad} onChange={v => set('ciudad', v)} placeholder="Barcelona" />
          <Field label="Provincia" value={s.provincia} onChange={v => set('provincia', v)} placeholder="Barcelona" />
          <Field label="País (ISO)" value={s.pais} onChange={v => set('pais', v.toUpperCase())} placeholder="ES" />
        </div>
      </Card>

      <SectionDivider n={3} title="Contacto" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Teléfono" value={s.telefono} onChange={v => set('telefono', v)} placeholder="+34 93 000 0000" />
          <Field label="Email fiscal" value={s.email_fiscal} onChange={v => set('email_fiscal', v)} placeholder="admin@firmarollers.com" />
        </div>
      </Card>
    </div>
  )
}

function FacturacionTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const nextInvoice = `${s.serie_default}-${new Date().getFullYear()}-${String(s.siguiente_numero).padStart(4, '0')}`
  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="Numeración correlativa" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Serie" value={s.serie_default} onChange={v => set('serie_default', v.toUpperCase())} placeholder="FR" />
          <div className="space-y-1.5">
            <label className={labelCls}>Siguiente número</label>
            <input type="number" min={1} value={s.siguiente_numero}
              onChange={e => set('siguiente_numero', parseInt(e.target.value) || 1)}
              className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">Próxima factura</span>
          <span className="font-mono font-black text-[#D93A35] text-sm">{nextInvoice}</span>
        </div>
        <p className="text-[11px] text-gray-400">⚠️ No modificar el número si ya hay facturas emitidas — obligación legal de numeración correlativa sin saltos.</p>
      </Card>

      <SectionDivider n={2} title="Impuestos y condiciones" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>IVA por defecto (%)</label>
            <input type="number" min={0} max={100} value={s.iva_default}
              onChange={e => set('iva_default', parseFloat(e.target.value) || 21)}
              className={inputCls} />
          </div>
          <Field label="Condiciones de pago" value={s.payment_terms} onChange={v => set('payment_terms', v)} placeholder="30 días" />
        </div>
        <Textarea label="Pie de factura (menciones legales)"
          value={s.pie_factura} onChange={v => set('pie_factura', v)}
          placeholder="Exento de IVA — inversión del sujeto pasivo (art. 84 LIVA). Operación exenta — exportación (art. 21 LIVA)."
          rows={4} />
      </Card>
    </div>
  )
}

function BancariosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="Cuenta bancaria" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Banco" value={s.banco} onChange={v => set('banco', v)} placeholder="CaixaBank" />
          <Field label="Titular" value={s.titular_cuenta} onChange={v => set('titular_cuenta', v)} placeholder="Firma Rollers SL" />
          <div className="sm:col-span-2">
            <Field label="IBAN" value={s.iban} onChange={v => set('iban', v.toUpperCase().replace(/\s/g, ''))} placeholder="ES0000000000000000000000" mono />
          </div>
          <Field label="BIC / SWIFT" value={s.bic} onChange={v => set('bic', v.toUpperCase())} placeholder="CAIXESBBXXX" mono />
        </div>
      </Card>
    </div>
  )
}

function EnviosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="General" />
      <Card>
        <div className="space-y-1.5">
          <label className={labelCls}>Incoterm por defecto</label>
          <select value={s.incoterm_default} onChange={e => set('incoterm_default', e.target.value)} className={inputCls}>
            {['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </Card>

      <SectionDivider n={2} title="Packlink" />
      <Card>
        <Field label="API Key" value={s.packlink_api_key} onChange={v => set('packlink_api_key', v)} placeholder="••••••••••••" mono />
      </Card>

      <SectionDivider n={3} title="DHL eCommerce" />
      <Card>
        <Field label="Account Number" value={s.dhl_account_number} onChange={v => set('dhl_account_number', v)} placeholder="123456789" mono />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="API Key" value={s.dhl_api_key} onChange={v => set('dhl_api_key', v)} placeholder="••••••••••••" mono />
          <Field label="API Secret" value={s.dhl_api_secret} onChange={v => set('dhl_api_secret', v)} placeholder="••••••••••••" mono />
        </div>
      </Card>

      <SectionDivider n={4} title="Contacto ADR" />
      <Card>
        <p className="text-[11px] text-gray-400">Requerido para envíos internacionales de refills (mercancías peligrosas clase 3).</p>
        <Field label="Nombre" value={s.adr_contact_name} onChange={v => set('adr_contact_name', v)} placeholder="Isaac Alcober" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Teléfono" value={s.adr_contact_phone} onChange={v => set('adr_contact_phone', v)} placeholder="+34 600 000 000" />
          <Field label="Email" value={s.adr_contact_email} onChange={v => set('adr_contact_email', v)} placeholder="adr@firmarollers.com" />
        </div>
      </Card>
    </div>
  )
}

function BrandingTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const BRAND_COLORS = ['#D93A35', '#E6883E', '#F6E451', '#0DA265', '#0087B8', '#876693', '#111111']

  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="Logo y color" />
      <Card>
        <Field label="URL del logo" value={s.logo_url} onChange={v => set('logo_url', v)}
          placeholder="https://b2b.firmarollers.com/FR_ICON_B.svg" />
        {s.logo_url && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4">
            <img src={s.logo_url} alt="Logo preview" className="h-10 w-auto" />
            <span className="text-xs text-gray-400">Preview</span>
          </div>
        )}
        <div className="space-y-1.5">
          <label className={labelCls}>Color primario</label>
          <div className="flex items-center gap-3">
            <input type="color" value={s.color_primario}
              onChange={e => set('color_primario', e.target.value)}
              className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-1 bg-white" />
            <input type="text" value={s.color_primario}
              onChange={e => set('color_primario', e.target.value)}
              className="w-32 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 outline-none focus:border-[#D93A35] transition-colors" />
            <div className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
              style={{ background: s.color_primario }} />
          </div>
          <div className="flex gap-2 mt-2">
            {BRAND_COLORS.map(c => (
              <button key={c} onClick={() => set('color_primario', c)}
                className="w-7 h-7 rounded-md flex-shrink-0 transition-transform hover:scale-110"
                style={{ background: c, outline: s.color_primario === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                title={c} />
            ))}
          </div>
        </div>
      </Card>

      <SectionDivider n={2} title="Preview documentos" />
      <Card>
        <p className="text-xs text-gray-400">
          Los PDFs se generan con los datos fiscales y de branding guardados. Guarda los cambios antes de previsualizar.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a href="/api/orders/preview/invoice" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-[#D93A35] hover:text-[#D93A35] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Preview Invoice
          </a>
          <a href="/api/orders/preview/packslip" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-[#D93A35] hover:text-[#D93A35] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Preview Packslip
          </a>
        </div>
        <p className="text-[11px] text-gray-400">
          Los previews usan el último pedido disponible como ejemplo.
        </p>
      </Card>
    </div>
  )
}

function DriveTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const driveUrl = s.gdrive_folder_id
    ? `https://drive.google.com/embeddedfolderview?id=${s.gdrive_folder_id}#list`
    : null
  const driveOpenUrl = s.gdrive_folder_id
    ? `https://drive.google.com/drive/folders/${s.gdrive_folder_id}`
    : null

  return (
    <div className="space-y-5">
      <SectionDivider n={1} title="Configuración" />
      <Card>
        <Field label="Google Drive Folder ID" value={s.gdrive_folder_id}
          onChange={v => set('gdrive_folder_id', v)}
          placeholder="1ViJQ_IF1PyuzF779usnfcHmHkshhggUx" mono />
        <p className="text-[11px] text-gray-400">
          El Folder ID es la parte final de la URL de Drive:<br />
          <span className="font-mono text-gray-500">
            drive.google.com/drive/folders/<strong className="text-[#D93A35]">FOLDER_ID</strong>
          </span>
        </p>
        {driveOpenUrl && (
          <a href={driveOpenUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-[#D93A35] hover:text-[#D93A35] transition-colors w-fit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            Open in Google Drive
          </a>
        )}
      </Card>

      {driveUrl && (
        <>
          <SectionDivider n={2} title="Brand Assets" />
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400">Google Drive — Brand Assets</span>
              <a href={driveOpenUrl!} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-bold text-[#D93A35] uppercase tracking-[0.1em] hover:underline">
                Open ↗
              </a>
            </div>
            <iframe
              src={driveUrl}
              className="w-full"
              style={{ height: 420, border: 'none' }}
              title="Brand Assets"
            />
          </div>
          <p className="text-[11px] text-gray-400 px-1">
            La carpeta debe ser pública o compartida con los emails del equipo para que el embed funcione.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────

export default function CompanyPage() {
  const [settings, setSettings] = useState<CompanySettings>(EMPTY)
  const [activeTab, setActiveTab] = useState<Tab>('Fiscal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.json())
      .then(({ data }) => { if (data) setSettings({ ...EMPTY, ...data }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function set(key: keyof CompanySettings, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setFeedback(null)
  }

  async function save() {
    setSaving(true); setFeedback(null)
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error saving') }
      setFeedback({ msg: 'Saved successfully', type: 'success' })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      setFeedback({ msg: err.message, type: 'error' })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>

  return (
    <div className="p-6 md:p-7 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
            style={{ fontFamily: 'var(--font-alexandria)' }}>Company</h1>
          <p className="text-xs text-gray-400 mt-0.5">Corporate settings — invoicing, shipping and communications</p>
        </div>
        <div className="flex items-center gap-3">
          {feedback && (
            <div className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
              feedback.type === 'success'
                ? 'bg-green-50 border-green-200 text-[#0DA265]'
                : 'bg-red-50 border-red-200 text-[#D93A35]'
            }`}>
              {feedback.msg}
            </div>
          )}
          <SaveButton saving={saving} onClick={save} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] uppercase whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#D93A35] text-[#D93A35]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Fiscal'      && <FiscalTab s={settings} set={set} />}
      {activeTab === 'Facturación' && <FacturacionTab s={settings} set={set} />}
      {activeTab === 'Bancarios'   && <BancariosTab s={settings} set={set} />}
      {activeTab === 'Envíos'      && <EnviosTab s={settings} set={set} />}
      {activeTab === 'Branding'    && <BrandingTab s={settings} set={set} />}
      {activeTab === 'Drive'       && <DriveTab s={settings} set={set} />}

      {/* Bottom save */}
      <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end items-center gap-3">
        {feedback && (
          <div className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-[#0DA265]'
              : 'bg-red-50 border-red-200 text-[#D93A35]'
          }`}>
            {feedback.msg}
          </div>
        )}
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  )
}
