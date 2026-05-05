'use client'

import { useState, useEffect } from 'react'

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

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="fr-label">{label}{required && <span style={{ color: '#D93A35', marginLeft: 2 }}>*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder = '', rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="fr-label">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginTop: 8 }}>
      <span className="fr-label" style={{ whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#111' }} />
    </div>
  )
}

function FiscalTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="Identidad legal" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Razón social" value={s.razon_social} onChange={v => set('razon_social', v)} placeholder="Firma Rollers SL" required />
          </div>
          <Field label="Nombre comercial" value={s.nombre_comercial} onChange={v => set('nombre_comercial', v)} placeholder="Firma Rollers" />
          <Field label="NIF / CIF" value={s.nif} onChange={v => set('nif', v.toUpperCase())} placeholder="B12345678" required />
          <Field label="Número EORI" value={s.eori} onChange={v => set('eori', v.toUpperCase())} placeholder="ES12345678901234" />
          <Field label="Web" value={s.web} onChange={v => set('web', v)} placeholder="https://firmarollers.com" />
        </div>
      </div>

      <SectionLabel title="Dirección fiscal" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Calle y número" value={s.direccion} onChange={v => set('direccion', v)} placeholder="Calle Ejemplo 1, 2º" />
          </div>
          <Field label="CP" value={s.cp} onChange={v => set('cp', v)} placeholder="08001" />
          <Field label="Ciudad" value={s.ciudad} onChange={v => set('ciudad', v)} placeholder="Barcelona" />
          <Field label="Provincia" value={s.provincia} onChange={v => set('provincia', v)} placeholder="Barcelona" />
          <Field label="País (ISO)" value={s.pais} onChange={v => set('pais', v.toUpperCase())} placeholder="ES" />
        </div>
      </div>

      <SectionLabel title="Contacto" />
      <div className="fr-card" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Teléfono" value={s.telefono} onChange={v => set('telefono', v)} placeholder="+34 93 000 0000" />
          <Field label="Email fiscal" value={s.email_fiscal} onChange={v => set('email_fiscal', v)} placeholder="admin@firmarollers.com" />
        </div>
      </div>
    </div>
  )
}

function FacturacionTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const nextInvoice = `${s.serie_default}-${new Date().getFullYear()}-${String(s.siguiente_numero).padStart(4, '0')}`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="Numeración correlativa" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Serie" value={s.serie_default} onChange={v => set('serie_default', v.toUpperCase())} placeholder="FR" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fr-label">Siguiente número</label>
            <input type="number" min={1} value={s.siguiente_numero} onChange={e => set('siguiente_numero', parseInt(e.target.value) || 1)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F7F7F2', border: '1px solid #111' }}>
          <span className="fr-label">Próxima factura</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: '#D93A35', fontSize: 13 }}>{nextInvoice}</span>
        </div>
        <p style={{ fontSize: 11, color: '#111' }}>⚠️ No modificar el número si ya hay facturas emitidas — obligación legal de numeración correlativa sin saltos.</p>
      </div>

      <SectionLabel title="Impuestos y condiciones" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fr-label">IVA por defecto (%)</label>
            <input type="number" min={0} max={100} value={s.iva_default} onChange={e => set('iva_default', parseFloat(e.target.value) || 21)} />
          </div>
          <Field label="Condiciones de pago" value={s.payment_terms} onChange={v => set('payment_terms', v)} placeholder="30 días" />
        </div>
        <TextareaField label="Pie de factura (menciones legales)" value={s.pie_factura} onChange={v => set('pie_factura', v)}
          placeholder="Exento de IVA — inversión del sujeto pasivo (art. 84 LIVA). Operación exenta — exportación (art. 21 LIVA)."
          rows={4} />
      </div>
    </div>
  )
}

function BancariosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="Cuenta bancaria" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Banco" value={s.banco} onChange={v => set('banco', v)} placeholder="CaixaBank" />
          <Field label="Titular" value={s.titular_cuenta} onChange={v => set('titular_cuenta', v)} placeholder="Firma Rollers SL" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="IBAN" value={s.iban} onChange={v => set('iban', v.toUpperCase().replace(/\s/g, ''))} placeholder="ES0000000000000000000000" />
          </div>
          <Field label="BIC / SWIFT" value={s.bic} onChange={v => set('bic', v.toUpperCase())} placeholder="CAIXESBBXXX" />
        </div>
      </div>
    </div>
  )
}

function EnviosTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="General" />
      <div className="fr-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fr-label">Incoterm por defecto</label>
          <select value={s.incoterm_default} onChange={e => set('incoterm_default', e.target.value)} style={{ width: 160 }}>
            {['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <SectionLabel title="Packlink" />
      <div className="fr-card" style={{ padding: 20 }}>
        <Field label="API Key" value={s.packlink_api_key} onChange={v => set('packlink_api_key', v)} placeholder="••••••••••••" />
      </div>

      <SectionLabel title="DHL eCommerce" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Account Number" value={s.dhl_account_number} onChange={v => set('dhl_account_number', v)} placeholder="123456789" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="API Key" value={s.dhl_api_key} onChange={v => set('dhl_api_key', v)} placeholder="••••••••••••" />
          <Field label="API Secret" value={s.dhl_api_secret} onChange={v => set('dhl_api_secret', v)} placeholder="••••••••••••" />
        </div>
      </div>

      <SectionLabel title="Contacto ADR" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 11, color: '#111' }}>Requerido para envíos internacionales de refills (mercancías peligrosas clase 3).</p>
        <Field label="Nombre" value={s.adr_contact_name} onChange={v => set('adr_contact_name', v)} placeholder="Isaac Alcober" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Teléfono" value={s.adr_contact_phone} onChange={v => set('adr_contact_phone', v)} placeholder="+34 600 000 000" />
          <Field label="Email" value={s.adr_contact_email} onChange={v => set('adr_contact_email', v)} placeholder="adr@firmarollers.com" />
        </div>
      </div>
    </div>
  )
}

function BrandingTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const BRAND_COLORS = ['#D93A35', '#E6883E', '#F6E451', '#0DA265', '#0087B8', '#876693', '#111111']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="Logo y color" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="URL del logo" value={s.logo_url} onChange={v => set('logo_url', v)} placeholder="https://b2b.firmarollers.com/FR_ICON_B.svg" />
        {s.logo_url && (
          <div style={{ padding: '12px 16px', background: '#F7F7F2', border: '1px solid #111', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={s.logo_url} alt="Logo preview" style={{ height: 40, width: 'auto' }} />
            <span className="fr-label">Preview</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fr-label">Color primario</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="color" value={s.color_primario} onChange={e => set('color_primario', e.target.value)}
              style={{ width: 40, height: 36, padding: 2, cursor: 'pointer', border: '1px solid #111' }} />
            <input type="text" value={s.color_primario} onChange={e => set('color_primario', e.target.value)} style={{ width: 120 }} />
            <div style={{ width: 36, height: 36, background: s.color_primario, border: '1px solid #111', flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {BRAND_COLORS.map(c => (
              <button key={c} onClick={() => set('color_primario', c)}
                style={{ width: 28, height: 28, background: c, border: s.color_primario === c ? '2px solid #111' : '1px solid #111', boxShadow: 'none', padding: 0, flexShrink: 0 }}
                title={c} />
            ))}
          </div>
        </div>
      </div>

      <SectionLabel title="Preview documentos" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 11, color: '#111' }}>Los PDFs se generan con los datos fiscales y de branding guardados. Guarda los cambios antes de previsualizar.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/api/pedidos/preview/invoice" target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost">Preview Invoice</button>
          </a>
          <a href="/api/pedidos/preview/packslip" target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost">Preview Packslip</button>
          </a>
        </div>
        <p style={{ fontSize: 11, color: '#111' }}>Los previews usan el último pedido disponible como ejemplo.</p>
      </div>
    </div>
  )
}

function DriveTab({ s, set }: { s: CompanySettings; set: (k: keyof CompanySettings, v: any) => void }) {
  const driveUrl = s.gdrive_folder_id ? `https://drive.google.com/embeddedfolderview?id=${s.gdrive_folder_id}#list` : null
  const driveOpenUrl = s.gdrive_folder_id ? `https://drive.google.com/drive/folders/${s.gdrive_folder_id}` : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel title="Configuración" />
      <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Google Drive Folder ID" value={s.gdrive_folder_id} onChange={v => set('gdrive_folder_id', v)} placeholder="1ViJQ_IF1PyuzF779usnfcHmHkshhggUx" />
        <p style={{ fontSize: 11, color: '#111' }}>
          El Folder ID es la parte final de la URL de Drive:<br />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            drive.google.com/drive/folders/<strong style={{ color: '#D93A35' }}>FOLDER_ID</strong>
          </span>
        </p>
        {driveOpenUrl && (
          <a href={driveOpenUrl} target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost">Open in Google Drive ↗</button>
          </a>
        )}
      </div>

      {driveUrl && (
        <>
          <SectionLabel title="Brand Assets" />
          <div className="fr-card" style={{ overflow: 'hidden' }}>
            <div className="fr-section-head">
              <span>Google Drive — Brand Assets</span>
              <a href={driveOpenUrl!} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#D93A35', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Open ↗
              </a>
            </div>
            <iframe src={driveUrl} style={{ width: '100%', height: 420, border: 'none', display: 'block' }} title="Brand Assets" />
          </div>
          <p style={{ fontSize: 11, color: '#111' }}>
            La carpeta debe ser pública o compartida con los emails del equipo para que el embed funcione.
          </p>
        </>
      )}
    </div>
  )
}

export default function CompanyPage() {
  const [settings, setSettings] = useState<CompanySettings>(EMPTY)
  const [activeTab, setActiveTab] = useState<Tab>('Fiscal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)

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
      const res = await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error saving') }
      setFeedback({ msg: 'Saved successfully', ok: true })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      setFeedback({ msg: err.message, ok: false })
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: 32, fontSize: 12, color: '#111' }}>Loading…</div>

  return (
    <div className="fr-page" style={{ maxWidth: 760 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="fr-label">Corporate settings</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Company</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {feedback && (
            <div style={{ padding: '8px 12px', border: `1px solid ${feedback.ok ? '#0DA265' : '#D93A35'}`, fontFamily: 'var(--font-mono)', fontSize: 11, color: feedback.ok ? '#0DA265' : '#D93A35' }}>
              {feedback.msg}
            </div>
          )}
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #111', gap: 0, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const active = activeTab === tab
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px', border: 'none', boxShadow: 'none',
                borderBottom: active ? '2px solid #111' : '2px solid transparent',
                background: 'transparent', color: '#111',
                fontWeight: active ? 700 : 500, fontSize: 12, letterSpacing: '0.03em',
                marginBottom: -1, whiteSpace: 'nowrap',
              }}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'Fiscal'      && <FiscalTab s={settings} set={set} />}
      {activeTab === 'Facturación' && <FacturacionTab s={settings} set={set} />}
      {activeTab === 'Bancarios'   && <BancariosTab s={settings} set={set} />}
      {activeTab === 'Envíos'      && <EnviosTab s={settings} set={set} />}
      {activeTab === 'Branding'    && <BrandingTab s={settings} set={set} />}
      {activeTab === 'Drive'       && <DriveTab s={settings} set={set} />}

      {/* Bottom save */}
      <div style={{ borderTop: '1px solid #111', paddingTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        {feedback && (
          <div style={{ padding: '8px 12px', border: `1px solid ${feedback.ok ? '#0DA265' : '#D93A35'}`, fontFamily: 'var(--font-mono)', fontSize: 11, color: feedback.ok ? '#0DA265' : '#D93A35' }}>
            {feedback.msg}
          </div>
        )}
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </div>
  )
}
