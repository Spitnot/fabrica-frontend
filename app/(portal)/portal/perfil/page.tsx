'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

interface CustomerProfile {
  contacto_nombre: string;
  company_name:    string;
  email:           string;
  telefono:        string;
  nif_cif:         string;
  tipo_cliente:    string | null;
  direccion_envio: {
    street:      string;
    city:        string;
    postal_code: string;
    country:     string;
  } | null;
}

const PHONE_PREFIXES = [
  { code: '+34', label: '🇪🇸 +34' }, { code: '+33', label: '🇫🇷 +33' },
  { code: '+49', label: '🇩🇪 +49' }, { code: '+39', label: '🇮🇹 +39' },
  { code: '+351', label: '🇵🇹 +351' }, { code: '+44', label: '🇬🇧 +44' },
  { code: '+1',  label: '🇺🇸 +1'  }, { code: '+52', label: '🇲🇽 +52' },
  { code: '+55', label: '🇧🇷 +55' }, { code: '+31', label: '🇳🇱 +31' },
  { code: '+32', label: '🇧🇪 +32' }, { code: '+41', label: '🇨🇭 +41' },
  { code: '+46', label: '🇸🇪 +46' }, { code: '+48', label: '🇵🇱 +48' },
];

function splitPhone(telefono: string) {
  for (const p of PHONE_PREFIXES) {
    if (telefono.startsWith(p.code + ' ')) {
      return { prefix: p.code, number: telefono.slice(p.code.length + 1) };
    }
  }
  return { prefix: '+34', number: telefono };
}

export default function PerfilPage() {
  const [profile, setProfile]       = useState<CustomerProfile | null>(null);
  const [editing, setEditing]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Editable draft
  const [draft, setDraft] = useState({
    contacto_nombre: '',
    telefono_prefix: '+34',
    telefono_number: '',
    street: '', city: '', postal_code: '', country: '',
  });

  // Password
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd]   = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/portal/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        setProfile(data);
        const { prefix, number } = splitPhone(data.telefono ?? '');
        setDraft({
          contacto_nombre: data.contacto_nombre ?? '',
          telefono_prefix: prefix,
          telefono_number: number,
          street:      data.direccion_envio?.street      ?? '',
          city:        data.direccion_envio?.city        ?? '',
          postal_code: data.direccion_envio?.postal_code ?? '',
          country:     data.direccion_envio?.country     ?? '',
        });
      });
  }, []);

  function startEdit() { setEditing(true); setProfileFeedback(null); }
  function cancelEdit() {
    if (!profile) return;
    const { prefix, number } = splitPhone(profile.telefono ?? '');
    setDraft({
      contacto_nombre: profile.contacto_nombre ?? '',
      telefono_prefix: prefix,
      telefono_number: number,
      street:      profile.direccion_envio?.street      ?? '',
      city:        profile.direccion_envio?.city        ?? '',
      postal_code: profile.direccion_envio?.postal_code ?? '',
      country:     profile.direccion_envio?.country     ?? '',
    });
    setEditing(false);
    setProfileFeedback(null);
  }

  async function saveProfile() {
    if (!draft.contacto_nombre.trim()) {
      setProfileFeedback({ type: 'error', msg: 'El nombre de contacto es obligatorio.' }); return;
    }
    if (!draft.postal_code.trim() || !draft.country.trim()) {
      setProfileFeedback({ type: 'error', msg: 'Código postal y país son obligatorios para los envíos.' }); return;
    }

    setSavingProfile(true);
    setProfileFeedback(null);
    const res = await fetch('/api/portal/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacto_nombre: draft.contacto_nombre.trim(),
        telefono: `${draft.telefono_prefix} ${draft.telefono_number}`.trim(),
        direccion_envio: {
          street:      draft.street.trim(),
          city:        draft.city.trim(),
          postal_code: draft.postal_code.trim(),
          country:     draft.country.trim(),
        },
      }),
    });
    setSavingProfile(false);

    if (!res.ok) {
      const d = await res.json();
      setProfileFeedback({ type: 'error', msg: d.error ?? 'Error al guardar.' });
      return;
    }

    // Update local state
    setProfile(prev => prev ? {
      ...prev,
      contacto_nombre: draft.contacto_nombre.trim(),
      telefono: `${draft.telefono_prefix} ${draft.telefono_number}`.trim(),
      direccion_envio: {
        street:      draft.street.trim(),
        city:        draft.city.trim(),
        postal_code: draft.postal_code.trim(),
        country:     draft.country.trim(),
      },
    } : prev);
    setEditing(false);
    setProfileFeedback({ type: 'success', msg: 'Perfil actualizado correctamente.' });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdFeedback(null);
    if (newPwd.length < 8) { setPwdFeedback({ type: 'error', msg: 'Mínimo 8 caracteres.' }); return; }
    if (newPwd !== confirmPwd) { setPwdFeedback({ type: 'error', msg: 'Las contraseñas no coinciden.' }); return; }
    setSavingPwd(true);
    const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) {
      setPwdFeedback({ type: 'error', msg: error.message });
    } else {
      setPwdFeedback({ type: 'success', msg: 'Contraseña actualizada.' });
      setNewPwd(''); setConfirmPwd('');
      setShowPwd(false);
    }
  }

  const inputCls  = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";
  const labelCls  = "text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400";
  const rowCls    = "flex justify-between items-center text-sm py-1";
  const req       = <span className="text-[#D93A35]">*</span>;

  function Feedback({ fb }: { fb: { type: 'success' | 'error'; msg: string } | null }) {
    if (!fb) return null;
    return (
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
        fb.type === 'success'
          ? 'bg-green-50 border border-green-200 text-[#0DA265]'
          : 'bg-red-50 border border-red-200 text-[#D93A35]'
      }`}>{fb.msg}</div>
    );
  }

  return (
    <div className="p-6 md:p-7 max-w-lg">
      <h1 className="text-lg font-black tracking-wider uppercase text-gray-900 mb-6"
          style={{ fontFamily: 'var(--font-alexandria)' }}>My Profile</h1>

      {/* ── Account card ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Account</span>
          {!editing
            ? <button onClick={startEdit} className="text-xs text-[#D93A35] font-semibold hover:underline">Edit</button>
            : <div className="flex gap-3">
                <button onClick={cancelEdit} className="text-xs text-gray-400 font-semibold hover:underline">Cancel</button>
                <button onClick={saveProfile} disabled={savingProfile}
                  className="text-xs text-[#D93A35] font-semibold hover:underline disabled:opacity-40">
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
          }
        </div>

        <div className="p-4 space-y-3">
          {/* Read-only: email, company, NIF */}
          <div className="space-y-1.5">
            {([
              ['Company',  profile?.company_name ?? '—'],
              ['Email',    profile?.email        ?? '—'],
              ['Tax ID',   profile?.nif_cif      ?? '—'],
            ] as [string, string][]).map(([lbl, val]) => (
              <div key={lbl} className={rowCls}>
                <span className="text-gray-400 text-sm">{lbl}</span>
                <span className="font-mono text-xs text-gray-500">{val}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            {!editing ? (
              <>
                <div className={rowCls}>
                  <span className="text-gray-400 text-sm">Name</span>
                  <span className="font-mono text-xs text-gray-700">{profile?.contacto_nombre ?? '—'}</span>
                </div>
                <div className={rowCls}>
                  <span className="text-gray-400 text-sm">Phone</span>
                  <span className="font-mono text-xs text-gray-700">{profile?.telefono ?? '—'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className={labelCls}>Name {req}</label>
                  <input
                    type="text" value={draft.contacto_nombre}
                    onChange={e => setDraft(d => ({ ...d, contacto_nombre: e.target.value }))}
                    className={inputCls} placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Phone</label>
                  <div className="flex gap-2">
                    <select
                      value={draft.telefono_prefix}
                      onChange={e => setDraft(d => ({ ...d, telefono_prefix: e.target.value }))}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none w-[100px] flex-shrink-0"
                    >
                      {PHONE_PREFIXES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                    <input
                      type="tel" value={draft.telefono_number}
                      onChange={e => setDraft(d => ({ ...d, telefono_number: e.target.value }))}
                      placeholder="612 345 678" className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {profileFeedback && <Feedback fb={profileFeedback} />}
        </div>
      </div>

      {/* ── Shipping address card ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Shipping Address</span>
          {!editing
            ? <button onClick={startEdit} className="text-xs text-[#D93A35] font-semibold hover:underline">Edit</button>
            : <div className="flex gap-3">
                <button onClick={cancelEdit} className="text-xs text-gray-400 font-semibold hover:underline">Cancel</button>
                <button onClick={saveProfile} disabled={savingProfile}
                  className="text-xs text-[#D93A35] font-semibold hover:underline disabled:opacity-40">
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
          }
        </div>
        <div className="p-4 space-y-3">
          {!editing ? (
            profile?.direccion_envio ? (
              <div className="space-y-1">
                {([
                  ['Street',      profile.direccion_envio.street],
                  ['City',        profile.direccion_envio.city],
                  ['Postal code', profile.direccion_envio.postal_code],
                  ['Country',     profile.direccion_envio.country],
                ] as [string, string][]).map(([lbl, val]) => (
                  <div key={lbl} className={rowCls}>
                    <span className="text-gray-400 text-sm">{lbl}</span>
                    <span className="font-mono text-xs text-gray-700">{val || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No shipping address on file.</p>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className={labelCls}>Street</label>
                <input type="text" value={draft.street}
                  onChange={e => setDraft(d => ({ ...d, street: e.target.value }))}
                  placeholder="Gran Vía 14, 3º" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>City</label>
                <input type="text" value={draft.city}
                  onChange={e => setDraft(d => ({ ...d, city: e.target.value }))}
                  placeholder="Madrid" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Postal code {req}</label>
                <input type="text" value={draft.postal_code}
                  onChange={e => setDraft(d => ({ ...d, postal_code: e.target.value }))}
                  placeholder="28013" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Country {req}</label>
                <input type="text" value={draft.country}
                  onChange={e => setDraft(d => ({ ...d, country: e.target.value }))}
                  placeholder="ES" className={inputCls} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Brand Assets card ─────────────────────────────────────── */}
      <a
        href="https://drive.google.com/drive/u/4/folders/1ViJQ_IF1PyuzF779usnfcHmHkshhggUx"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 hover:border-[#D93A35] hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-[#D93A35] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 18h13.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v10.5A1.5 1.5 0 003 18zm13.5-11.25h.008v.008h-.008V6.75z" />
          </svg>
          <div>
            <p className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400 group-hover:text-[#D93A35] transition-colors"
               style={{ fontFamily: 'var(--font-alexandria)' }}>Brand Assets</p>
            <p className="text-xs text-gray-500 mt-0.5">Logos, fonts and graphic materials</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#D93A35] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* ── Export Docs card ──────────────────────────────────────── */}
      <a
        href="https://drive.google.com/drive/folders/1SdTWawU8cUDBqlZ940ZRJvdR5txKBbmS?usp=drive_link"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 hover:border-[#D93A35] hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-[#D93A35] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div>
            <p className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400 group-hover:text-[#D93A35] transition-colors"
               style={{ fontFamily: 'var(--font-alexandria)' }}>Export Documentation</p>
            <p className="text-xs text-gray-500 mt-0.5">Technical specs and export guidelines</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#D93A35] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* ── Security card ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Security</span>
          <button
            onClick={() => { setShowPwd(v => !v); setPwdFeedback(null); }}
            className="text-xs text-[#D93A35] font-semibold hover:underline"
          >
            {showPwd ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {!showPwd && (
          <p className="px-4 py-3 text-sm text-gray-400">
            Password managed securely.
          </p>
        )}

        {showPwd && (
          <form onSubmit={savePassword} className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className={labelCls}>New Password {req}</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Minimum 8 characters" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Confirm Password {req}</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password" className={inputCls} />
            </div>
            <Feedback fb={pwdFeedback} />
            <button type="submit" disabled={savingPwd}
              className="w-full py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
              {savingPwd ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
