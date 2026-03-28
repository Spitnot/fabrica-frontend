'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

interface CustomerProfile {
  contacto_nombre: string;
  company_name: string;
  email: string;
  telefono: string;
  nif_cif: string;
  tipo_cliente: string | null;
  direccion_envio: { street: string; city: string; postal_code: string; country: string } | null;
}

const PHONE_PREFIXES = [
  { code: '+34', label: '🇪🇸 +34' }, { code: '+33', label: '🇫🇷 +33' },
  { code: '+49', label: '🇩🇪 +49' }, { code: '+39', label: '🇮🇹 +39' },
  { code: '+351', label: '🇵🇹 +351' }, { code: '+44', label: '🇬🇧 +44' },
  { code: '+1', label: '🇺🇸 +1' }, { code: '+52', label: '🇲🇽 +52' },
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

function Feedback({ fb }: { fb: { type: 'success' | 'error'; msg: string } | null }) {
  if (!fb) return null;
  return (
    <div style={{
      padding: '8px 12px', fontSize: 12, fontWeight: 600,
      background: fb.type === 'success' ? '#f0fdf4' : '#fff8f8',
      border: `1px solid ${fb.type === 'success' ? '#0DA265' : '#D93A35'}`,
      color: fb.type === 'success' ? '#0DA265' : '#D93A35',
    }}>
      {fb.msg}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Too weak',    color: '#D93A35' },
    { label: 'Weak',        color: '#E6883E' },
    { label: 'Fair',        color: '#F6E451' },
    { label: 'Strong',      color: '#0DA265' },
    { label: 'Very strong', color: '#0DA265' },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

function PasswordRequirements({ password }: { password: string }) {
  if (!password.length) return null;
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter',  pass: /[A-Z]/.test(password) },
    { label: 'One number',            pass: /[0-9]/.test(password) },
  ];
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {checks.map(({ label, pass }) => (
        <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: pass ? '#0DA265' : '#ccc' }}>{pass ? '✓' : '○'}</span>
          <span style={{ color: pass ? '#0DA265' : '#aaa', fontWeight: pass ? 600 : 400 }}>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [draft, setDraft] = useState({
    contacto_nombre: '', telefono_prefix: '+34', telefono_number: '',
    street: '', city: '', postal_code: '', country: '',
  });

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const strength = getStrength(newPwd);

  useEffect(() => {
    fetch('/api/portal/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        setProfile(data);
        const { prefix, number } = splitPhone(data.telefono ?? '');
        setDraft({
          contacto_nombre: data.contacto_nombre ?? '',
          telefono_prefix: prefix, telefono_number: number,
          street: data.direccion_envio?.street ?? '',
          city: data.direccion_envio?.city ?? '',
          postal_code: data.direccion_envio?.postal_code ?? '',
          country: data.direccion_envio?.country ?? '',
        });
      });
  }, []);

  function startEdit() { setEditing(true); setProfileFeedback(null); }

  function cancelEdit() {
    if (!profile) return;
    const { prefix, number } = splitPhone(profile.telefono ?? '');
    setDraft({
      contacto_nombre: profile.contacto_nombre ?? '',
      telefono_prefix: prefix, telefono_number: number,
      street: profile.direccion_envio?.street ?? '',
      city: profile.direccion_envio?.city ?? '',
      postal_code: profile.direccion_envio?.postal_code ?? '',
      country: profile.direccion_envio?.country ?? '',
    });
    setEditing(false);
    setProfileFeedback(null);
  }

  async function saveProfile() {
    if (!draft.contacto_nombre.trim()) {
      setProfileFeedback({ type: 'error', msg: 'Contact name is required.' }); return;
    }
    if (!draft.postal_code.trim() || !draft.country.trim()) {
      setProfileFeedback({ type: 'error', msg: 'Postal code and country are required for shipping.' }); return;
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
          street: draft.street.trim(), city: draft.city.trim(),
          postal_code: draft.postal_code.trim(), country: draft.country.trim(),
        },
      }),
    });
    setSavingProfile(false);
    if (!res.ok) {
      const d = await res.json();
      setProfileFeedback({ type: 'error', msg: d.error ?? 'Error saving.' });
      return;
    }
    setProfile(prev => prev ? {
      ...prev,
      contacto_nombre: draft.contacto_nombre.trim(),
      telefono: `${draft.telefono_prefix} ${draft.telefono_number}`.trim(),
      direccion_envio: { street: draft.street.trim(), city: draft.city.trim(), postal_code: draft.postal_code.trim(), country: draft.country.trim() },
    } : prev);
    setEditing(false);
    setProfileFeedback({ type: 'success', msg: 'Profile updated.' });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdFeedback(null);
    if (newPwd.length < 8) { setPwdFeedback({ type: 'error', msg: 'Minimum 8 characters.' }); return; }
    if (!/[A-Z]/.test(newPwd)) { setPwdFeedback({ type: 'error', msg: 'Must contain at least one uppercase letter.' }); return; }
    if (!/[0-9]/.test(newPwd)) { setPwdFeedback({ type: 'error', msg: 'Must contain at least one number.' }); return; }
    if (newPwd !== confirmPwd) { setPwdFeedback({ type: 'error', msg: 'Passwords do not match.' }); return; }
    setSavingPwd(true);
    const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) {
      setPwdFeedback({ type: 'error', msg: error.message });
    } else {
      setPwdFeedback({ type: 'success', msg: 'Password updated.' });
      setNewPwd(''); setConfirmPwd('');
      setShowNewPwd(false); setShowConfirmPwd(false);
      setShowPwd(false);
    }
  }

  const inp: React.CSSProperties = {
    fontFamily: 'var(--font-main)', fontSize: 13, border: '1px solid #111',
    borderRadius: 0, padding: '9px 10px', background: '#fff', color: '#111', outline: 'none', width: '100%',
  };

  const lbl: React.CSSProperties = {
    fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa',
  };

  function CardHeader({ title, onEdit }: { title: string; onEdit?: () => void }) {
    return (
      <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#111' }}>{title}</span>
        {onEdit && (
          <div style={{ display: 'flex', gap: 12 }}>
            {editing ? (
              <>
                <button onClick={cancelEdit} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', padding: 0 }}>Cancel</button>
                <button onClick={saveProfile} disabled={savingProfile} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35', padding: 0 }}>
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35', padding: 0 }}>Edit</button>
            )}
          </div>
        )}
      </div>
    );
  }

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '1px solid #f5f5f5' }}>
        <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', textAlign: 'right' }}>{value || '—'}</span>
      </div>
    );
  }

  function LinkCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{subtitle}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </div>
      </a>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{ paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 4 }}>
        <div className="page-title">My Profile</div>
      </div>

      {/* Account card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <CardHeader title="Account" onEdit={startEdit} />
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <InfoRow label="Company" value={profile?.company_name ?? ''} />
          <InfoRow label="Email" value={profile?.email ?? ''} />
          <InfoRow label="Tax ID" value={profile?.nif_cif ?? ''} />
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {!editing ? (
              <>
                <InfoRow label="Name" value={profile?.contacto_nombre ?? ''} />
                <InfoRow label="Phone" value={profile?.telefono ?? ''} />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={lbl}>Name *</label>
                  <input type="text" value={draft.contacto_nombre}
                    onChange={e => setDraft(d => ({ ...d, contacto_nombre: e.target.value }))}
                    placeholder="Your name" style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={lbl}>Phone</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={draft.telefono_prefix}
                      onChange={e => setDraft(d => ({ ...d, telefono_prefix: e.target.value }))}
                      style={{ ...inp, width: 110, flexShrink: 0 }}>
                      {PHONE_PREFIXES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                    <input type="tel" value={draft.telefono_number}
                      onChange={e => setDraft(d => ({ ...d, telefono_number: e.target.value }))}
                      placeholder="612 345 678" style={inp} />
                  </div>
                </div>
              </div>
            )}
          </div>
          {profileFeedback && <div style={{ marginTop: 8 }}><Feedback fb={profileFeedback} /></div>}
        </div>
      </div>

      {/* Shipping address card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <CardHeader title="Shipping Address" onEdit={startEdit} />
        <div style={{ padding: '12px 16px' }}>
          {!editing ? (
            profile?.direccion_envio ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <InfoRow label="Street" value={profile.direccion_envio.street} />
                <InfoRow label="City" value={profile.direccion_envio.city} />
                <InfoRow label="Postal code" value={profile.direccion_envio.postal_code} />
                <InfoRow label="Country" value={profile.direccion_envio.country} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#aaa' }}>No shipping address on file.</div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={lbl}>Street</label>
                <input type="text" value={draft.street} onChange={e => setDraft(d => ({ ...d, street: e.target.value }))} placeholder="Gran Vía 14, 3º" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={lbl}>City</label>
                  <input type="text" value={draft.city} onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} placeholder="Madrid" style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={lbl}>Postal code *</label>
                  <input type="text" value={draft.postal_code} onChange={e => setDraft(d => ({ ...d, postal_code: e.target.value }))} placeholder="28013" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={lbl}>Country *</label>
                <input type="text" value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} placeholder="ES" style={inp} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brand assets */}
      <LinkCard
        href="https://drive.google.com/drive/u/4/folders/1ViJQ_IF1PyuzF779usnfcHmHkshhggUx"
        title="Brand Assets"
        subtitle="Logos, fonts and graphic materials"
      />

      {/* Export docs */}
      <LinkCard
        href="https://drive.google.com/drive/folders/1SdTWawU8cUDBqlZ940ZRJvdR5txKBbmS?usp=drive_link"
        title="Export Documentation"
        subtitle="Technical specs and export guidelines"
      />

      {/* Security */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#111' }}>Security</span>
          <button
            onClick={() => { setShowPwd(v => !v); setPwdFeedback(null); setNewPwd(''); setConfirmPwd(''); }}
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35', padding: 0 }}
          >
            {showPwd ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {!showPwd ? (
          <div style={{ padding: '12px 16px', fontSize: 12, color: '#aaa' }}>Password managed securely.</div>
        ) : (
          <form onSubmit={savePassword} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* New password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={lbl}>New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  style={{ ...inp, paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}
                >
                  {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {newPwd.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        height: 3, flex: 1,
                        background: i <= strength.score ? strength.color : '#eee',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={lbl}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  style={{ ...inp, paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}
                >
                  {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Requirements */}
            <PasswordRequirements password={newPwd} />

            <Feedback fb={pwdFeedback} />

            <button type="submit" disabled={savingPwd} className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              {savingPwd ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
