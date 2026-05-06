'use client'

import { useState, useEffect, useRef } from 'react'
import { FR } from '@/components/fr/Atoms'
import Link from 'next/link'

interface Hero {
  id?: string
  active: boolean
  bg_image_url: string
  titulo: string
  descripcion: string
  cta_label: string
  cta_href: string
}

const EMPTY: Hero = {
  active: false,
  bg_image_url: '',
  titulo: '',
  descripcion: '',
  cta_label: 'New Order',
  cta_href: '/portal/pedidos/nuevo',
}

const inp: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: 12, border: '1px solid #111', borderRadius: 0,
  padding: '9px 12px', background: '#fff', color: '#111',
  outline: 'none', width: '100%',
}

export default function ContenidoPage() {
  const [hero, setHero]       = useState<Hero>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/contenido/upload', { method: 'POST', body: form })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json()
      setFeedback({ type: 'err', msg: d.error ?? 'Upload failed' })
      return
    }
    const { url } = await res.json()
    set('bg_image_url', url)
  }

  useEffect(() => {
    fetch('/api/contenido/hero')
      .then(r => r.json())
      .then(d => { if (d.data) setHero(d.data) })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Hero>(k: K, v: Hero[K]) {
    setHero(h => ({ ...h, [k]: v }))
    setFeedback(null)
  }

  async function save() {
    setSaving(true); setFeedback(null)
    const res = await fetch('/api/contenido/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hero),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setFeedback({ type: 'err', msg: d.error ?? 'Error saving' })
    } else {
      setFeedback({ type: 'ok', msg: 'Saved.' })
    }
  }

  if (loading) return (
    <div className="fr-page">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Loading…</div>
    </div>
  )

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="fr-label">Portal · Content</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Hero Banner</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Active toggle */}
          <button
            onClick={() => set('active', !hero.active)}
            style={{
              padding: '8px 16px', border: '1px solid #111',
              background: hero.active ? '#111' : '#fff',
              color: hero.active ? '#fff' : '#111',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer', boxShadow: 'none',
            }}
          >
            {hero.active ? '● ACTIVE' : '○ INACTIVE'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary"
            style={{ padding: '8px 20px' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '10px 14px',
          border: `1px solid ${feedback.type === 'ok' ? FR.green : FR.red}`,
          background: feedback.type === 'ok' ? '#F0FFF7' : '#FFF0F0',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: feedback.type === 'ok' ? FR.green : FR.red,
        }}>
          {feedback.type === 'ok' ? '✓' : '✕'} {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT: form */}
        <div className="fr-card" style={{ overflow: 'hidden' }}>
          <div className="fr-section-head">CONTENT</div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Background image</label>

              {/* Thumbnail + upload button */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 48, flexShrink: 0,
                  border: '1px solid #111',
                  background: hero.bg_image_url
                    ? `url(${hero.bg_image_url}) center/cover no-repeat`
                    : '#F7F7F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!hero.bg_image_url && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="0"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  )}
                </div>
                <input
                  ref={fileRef} type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '7px 14px', border: '1px solid #111', background: '#fff',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
                    boxShadow: 'none',
                  }}
                >
                  {uploading ? 'Uploading…' : 'Upload image'}
                </button>
                {hero.bg_image_url && (
                  <button
                    type="button"
                    onClick={() => set('bg_image_url', '')}
                    style={{
                      padding: '7px 10px', border: '1px solid #111', background: '#fff',
                      fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer',
                      boxShadow: 'none',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* URL override */}
              <input
                type="url" value={hero.bg_image_url} style={inp}
                placeholder="https://… (or paste URL directly)"
                onChange={e => set('bg_image_url', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Headline *</label>
              <input
                type="text" value={hero.titulo} style={inp}
                placeholder="NEW COLLECTION."
                onChange={e => set('titulo', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Description</label>
              <textarea
                value={hero.descripcion} rows={3}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="Discover the latest products available for order."
                onChange={e => set('descripcion', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="fr-label">CTA label</label>
                <input
                  type="text" value={hero.cta_label} style={inp}
                  placeholder="New Order"
                  onChange={e => set('cta_label', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="fr-label">CTA link</label>
                <input
                  type="text" value={hero.cta_href} style={inp}
                  placeholder="/portal/pedidos/nuevo"
                  onChange={e => set('cta_href', e.target.value)}
                />
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT: live preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="fr-label">PREVIEW</div>
          <HeroPreview hero={hero} />
          {!hero.active && (
            <div style={{
              padding: '8px 12px', border: `1px solid ${FR.orange}`,
              fontFamily: 'var(--font-mono)', fontSize: 9, color: FR.orange,
            }}>
              ⚠ Hero is INACTIVE — not visible to clients. Toggle to activate.
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#111' }}>
            Visible at{' '}
            <Link href="/portal" target="_blank" style={{ color: FR.red }}>
              /portal
            </Link>
          </div>
        </div>

      </div>
      <style>{`@media(max-width:900px){.contenido-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}

function HeroPreview({ hero }: { hero: Hero }) {
  const hasImage = !!hero.bg_image_url
  const hasContent = hero.titulo || hero.descripcion || hero.cta_label

  return (
    <div style={{
      position: 'relative', width: '100%', height: 240,
      background: hasImage ? `url(${hero.bg_image_url}) center/cover no-repeat` : '#111',
      border: '1px solid #111', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)',
      }} />

      {!hasContent && !hasImage && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          No content yet
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hero.titulo && (
          <div style={{
            fontFamily: 'var(--font-display, Alexandria, sans-serif)',
            fontWeight: 900, fontSize: 28, lineHeight: 0.95,
            letterSpacing: '-0.03em', textTransform: 'uppercase', color: '#fff',
          }}>
            {hero.titulo}<span style={{ color: FR.red }}>.</span>
          </div>
        )}
        {hero.descripcion && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.5, maxWidth: 320,
          }}>
            {hero.descripcion}
          </div>
        )}
        {hero.cta_label && (
          <div style={{ marginTop: 4 }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 18px', background: '#fff', color: '#111',
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              {hero.cta_label} →
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
