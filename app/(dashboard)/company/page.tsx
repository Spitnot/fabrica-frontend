'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────

interface CompanySettings {
  id: string
  // Fiscal
  razon_social: string
  nombre_comercial: string
  nif: string
  eori: string
  direccion: string
  ciudad: string
  cp: string
  provincia: string
  pais: string
  telefono: string
  email_fiscal: string
  web: string
  // Facturación
  serie_default: string
  siguiente_numero: number
  iva_default: number
  pie_factura: string
  payment_terms: string
  // Bancarios
  iban: string
  bic: string
  titular_cuenta: string
  banco: string
  // Branding
  logo_url: string
  color_primario: string
  // Envíos
  incoterm_default: string
  packlink_api_key: string
  dhl_account_number: string
  dhl_api_key: string
  dhl_api_secret: string
  // ADR
  adr_contact_name: string
  adr_contact_phone: string
  adr_contact_email: string
  // Drive
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

// ─── Styles ───────────────────────────────────────────────

const inp: React.CSSProperties = {
  fontFamily: 'var(--font-main)', fontSize: 13,
  border: '1px solid #111', borderRadius: 0,
  padding: '8px 10px', background: '#fff',
  color: '#111', outline: 'none', width: '100%',
}

const lbl: React.CSSProperties = {
  fontSize: 8, fontWeight: 700, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#aaa', marginBottom: 4, display: 'block',
}

const secret: React.CSSProperties = {
  ...inp, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#555',
}

// ─── Field components ─────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder = '', mono = false }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; mono?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={lbl}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={mono ? secret : inp}
      />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder = '', rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-main)' }}
      />
    </div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {children}
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#111' }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{subtitle}</div>}
    </div>
  )
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        background: '#111', color: '#fff', border: '1px solid #111',
        padding: '9px 20px', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.5 : 1,
        boxShadow: '2px 2px 0 #D93A35',
      }}
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  )
}

function Feedback({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      padding: '8px 12px', fontSize: 11, fontWeight: 600,
      background: type === 'success' ? '#f0fdf4' : '#fff8f8',
      border: `1px solid ${type === 'success' ? '#0DA265' : '#D93A35'}`,
      color: type === 'success' ? '#0DA265' : '#D93A35',
    }}>
      {msg}
    </div>
  )
}

// ─── Tab panels ───────────────────────────────────────────

function FiscalTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Identidad legal" subtitle="Datos que aparecen en facturas y documentos oficiales" />
      <Grid>
        <Field label="Razón social *" value={s.razon_social} onChange={v => set('razon_social', v)} placeholder="Firma Rollers SL" />
        <Field label="Nombre comercial" value={s.nombre_comercial} onChange={v => set('nombre_comercial', v)} placeholder="Firma Rollers" />
        <Field label="NIF / CIF *" value={s.nif} onChange={v => set('nif', v.toUpperCase())} placeholder="B12345678" mono />
        <Field label="Número EORI" value={s.eori} onChange={v => set('eori', v.toUpperCase())} placeholder="ES12345678901234" mono />
      </Grid>
      <SectionTitle title="Dirección fiscal" />
      <Field label="Calle y número" value={s.direccion} onChange={v => set('direccion', v)} placeholder="Calle Ejemplo 1, 2º" />
      <Grid cols={3}>
        <Field label="CP" value={s.cp} onChange={v => set('cp', v)} placeholder="08001" />
        <Field label="Ciudad" value={s.ciudad} onChange={v => set('ciudad', v)} placeholder="Barcelona" />
        <Field label="Provincia" value={s.provincia} onChange={v => set('provincia', v)} placeholder="Barcelona" />
      </Grid>
      <Grid>
        <Field label="País (ISO)" value={s.pais} onChange={v => set('pais', v.toUpperCase())} placeholder="ES" />
        <Field label="Teléfono" value={s.telefono} onChange={v => set('telefono', v)} placeholder="+34 93 000 0000" />
      </Grid>
      <Grid>
        <Field label="Email fiscal" value={s.email_fiscal} onChange={v => set('email_fiscal', v)} placeholder="admin@firmarollers.com" />
        <Field label="Web" value={s.web} onChange={v => set('web', v)} placeholder="https://firmarollers.com" />
      </Grid>
    </div>
  )
}

function FacturacionTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const nextInvoice = `${s.serie_default}-${new Date().getFullYear()}-${String(s.siguiente_numero).padStart(4, '0')}`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Numeración" subtitle="La numeración correlativa es obligación legal — no modificar si hay facturas emitidas" />
      <Grid>
        <Field label="Serie" value={s.serie_default} onChange={v => set('serie_default', v.toUpperCase())} placeholder="FR" />
        <div>
          <label style={lbl}>Siguiente número</label>
          <input
            type="number" min={1} value={s.siguiente_numero}
            onChange={e => set('siguiente_numero', parseInt(e.target.value) || 1)}
            style={inp}
          />
        </div>
      </Grid>
      <div style={{ padding: '10px 14px', background: '#f9f9f9', border: '1px solid #eee', fontSize: 12 }}>
        <span style={{ color: '#aaa', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Próxima factura: </span>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#D93A35' }}>{nextInvoice}</span>
      </div>
      <SectionTitle title="Impuestos y condiciones" />
      <Grid>
        <div>
          <label style={lbl}>IVA por defecto (%)</label>
          <input
            type="number" min={0} max={100} value={s.iva_default}
            onChange={e => set('iva_default', parseFloat(e.target.value) || 21)}
            style={inp}
          />
        </div>
        <Field label="Condiciones de pago" value={s.payment_terms} onChange={v => set('payment_terms', v)} placeholder="30 días" />
      </Grid>
      <Textarea
        label="Pie de factura (menciones legales)"
        value={s.pie_factura}
        onChange={v => set('pie_factura', v)}
        placeholder="IVA incluido según art. 84 LIVA. Exento de IVA — inversión del sujeto pasivo."
        rows={4}
      />
    </div>
  )
}

function BancariosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Cuenta bancaria" subtitle="Aparece en facturas para transferencias" />
      <Field label="Banco" value={s.banco} onChange={v => set('banco', v)} placeholder="CaixaBank" />
      <Field label="Titular" value={s.titular_cuenta} onChange={v => set('titular_cuenta', v)} placeholder="Firma Rollers SL" />
      <Field label="IBAN" value={s.iban} onChange={v => set('iban', v.toUpperCase().replace(/\s/g, ''))} placeholder="ES0000000000000000000000" mono />
      <Field label="BIC / SWIFT" value={s.bic} onChange={v => set('bic', v.toUpperCase())} placeholder="CAIXESBBXXX" mono />
    </div>
  )
}

function EnviosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Configuración general" />
      <div>
        <label style={lbl}>Incoterm por defecto</label>
        <select value={s.incoterm_default} onChange={e => set('incoterm_default', e.target.value)} style={inp}>
          {['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <SectionTitle title="Packlink" subtitle="API key para cotización y generación de envíos" />
      <Field label="API Key" value={s.packlink_api_key} onChange={v => set('packlink_api_key', v)} placeholder="••••••••••••" mono />

      <SectionTitle title="DHL eCommerce" subtitle="Cuenta ADR — para envíos internacionales y mercancías peligrosas" />
      <Field label="Account Number" value={s.dhl_account_number} onChange={v => set('dhl_account_number', v)} placeholder="123456789" mono />
      <Grid>
        <Field label="API Key" value={s.dhl_api_key} onChange={v => set('dhl_api_key', v)} placeholder="••••••••••••" mono />
        <Field label="API Secret" value={s.dhl_api_secret} onChange={v => set('dhl_api_secret', v)} placeholder="••••••••••••" mono />
      </Grid>

      <SectionTitle title="Contacto ADR" subtitle="Requerido para envíos de mercancías peligrosas (refills)" />
      <Field label="Nombre" value={s.adr_contact_name} onChange={v => set('adr_contact_name', v)} placeholder="Isaac Alcober" />
      <Grid>
        <Field label="Teléfono" value={s.adr_contact_phone} onChange={v => set('adr_contact_phone', v)} placeholder="+34 600 000 000" />
        <Field label="Email" value={s.adr_contact_email} onChange={v => set('adr_contact_email', v)} placeholder="adr@firmarollers.com" />
      </Grid>
    </div>
  )
}

function BrandingTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Branding PDF" subtitle="Aparece en facturas, packslips y documentos generados" />
      <Field label="URL del logo" value={s.logo_url} onChange={v => set('logo_url', v)} placeholder="https://b2b.firmarollers.com/FR_ICON_B.svg" />
      {s.logo_url && (
        <div style={{ padding: 12, border: '1px solid #eee', background: '#f9f9f9', display: 'inline-block' }}>
          <img src={s.logo_url} alt="Logo preview" style={{ height: 40, width: 'auto' }} />
        </div>
      )}
      <div>
        <label style={lbl}>Color primario</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color" value={s.color_primario}
            onChange={e => set('color_primario', e.target.value)}
            style={{ width: 40, height: 36, border: '1px solid #111', padding: 2, cursor: 'pointer', background: '#fff' }}
          />
          <input
            type="text" value={s.color_primario}
            onChange={e => set('color_primario', e.target.value)}
            style={{ ...inp, width: 120, fontFamily: 'monospace' }}
          />
          <div style={{ width: 36, height: 36, background: s.color_primario, border: '1px solid #111' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {['#D93A35', '#E6883E', '#F6E451', '#0DA265', '#0087B8', '#876693', '#111111'].map(c => (
          <button
            key={c}
            onClick={() => set('color_primario', c)}
            style={{
              width: 28, height: 28, background: c, border: `2px solid ${s.color_primario === c ? '#111' : 'transparent'}`,
              cursor: 'pointer', padding: 0,
            }}
            title={c}
          />
        ))}
      </div>
    </div>
  )
}

function DriveTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const driveUrl = s.gdrive_folder_id
    ? `https://drive.google.com/drive/folders/${s.gdrive_folder_id}`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle title="Google Drive" subtitle="Carpeta de brand assets accesible desde el portal de cliente" />
      <Field
        label="Folder ID"
        value={s.gdrive_folder_id}
        onChange={v => set('gdrive_folder_id', v)}
        placeholder="1ViJQ_IF1PyuzF779usnfcHmHkshhggUx"
        mono
      />
      <div style={{ fontSize: 11, color: '#aaa' }}>
        El Folder ID es la parte final de la URL de Google Drive:<br />
        <span style={{ fontFamily: 'monospace', color: '#555' }}>
          drive.google.com/drive/folders/<strong style={{ color: '#D93A35' }}>FOLDER_ID</strong>
        </span>
      </div>
      {driveUrl && (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', background: '#f9f9f9',
            border: '1px solid #111', fontSize: 11, fontWeight: 700,
            textDecoration: 'none', color: '#111',
            boxShadow: '2px 2px 0 #111',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          Open in Google Drive
        </a>
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
      .then(({ data }) => {
        if (data) setSettings({ ...EMPTY, ...data })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function set(key: keyof CompanySettings, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setFeedback(null)
  }

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error saving')
      }
      setFeedback({ msg: 'Saved successfully', type: 'success' })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      setFeedback({ msg: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 24, fontSize: 12, color: '#aaa' }}>Loading…</div>
  )

  return (
    <div style={{ padding: '16px', maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Company</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
            Corporate settings — invoicing, shipping and communications
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {feedback && <Feedback {...feedback} />}
          <SaveButton saving={saving} onClick={save} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #111', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              border: 'none', borderBottom: activeTab === tab ? '2px solid #D93A35' : '2px solid transparent',
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#D93A35' : '#aaa',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeTab === 'Fiscal'      && <FiscalTab s={settings} set={set} />}
        {activeTab === 'Facturación' && <FacturacionTab s={settings} set={set} />}
        {activeTab === 'Bancarios'   && <BancariosTab s={settings} set={set} />}
        {activeTab === 'Envíos'      && <EnviosTab s={settings} set={set} />}
        {activeTab === 'Branding'    && <BrandingTab s={settings} set={set} />}
        {activeTab === 'Drive'       && <DriveTab s={settings} set={set} />}
      </div>

      {/* Bottom save */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        {feedback && <Feedback {...feedback} />}
        <SaveButton saving={saving} onClick={save} />
      </div>

    </div>
  )
}
