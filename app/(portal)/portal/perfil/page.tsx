'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  telefono: string | null;
  nif_cif: string | null;
  tipo_cliente: string | null;
  direccion_envio: { street?: string; city?: string; postal_code?: string; country?: string } | null;
}

export default function PerfilPage() {
  const [info, setInfo]                       = useState<CustomerInfo | null>(null);
  const [showPwdForm, setShowPwdForm]         = useState(false);
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving]                   = useState(false);
  const [feedback, setFeedback]               = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return;
      const { data: cust } = await supabaseClient
        .from('customers')
        .select('contacto_nombre, company_name, email, telefono, nif_cif, tipo_cliente, direccion_envio')
        .eq('auth_user_id', session.user.id)
        .single();
      if (cust) setInfo({
        name:           cust.contacto_nombre,
        company:        cust.company_name,
        email:          cust.email,
        telefono:       cust.telefono,
        nif_cif:        cust.nif_cif,
        tipo_cliente:   cust.tipo_cliente,
        direccion_envio: cust.direccion_envio,
      });
    }
    load();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setFeedback({ type: 'error', msg: error.message });
    } else {
      setFeedback({ type: 'success', msg: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPwdForm(false);
    }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";
  const rowCls   = "flex justify-between items-center text-sm py-1";
  const lblCls   = "text-gray-400 shrink-0";
  const valCls   = "font-mono text-xs text-gray-700 text-right";

  function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>{title}</span>
        </div>
        <div className="p-4">{children}</div>
      </div>
    );
  }

  const addr = info?.direccion_envio;
  const addrLine = addr
    ? [addr.street, addr.postal_code && addr.city ? `${addr.postal_code} ${addr.city}` : addr.city, addr.country]
        .filter(Boolean).join(' · ')
    : null;

  return (
    <div className="p-6 md:p-7 max-w-lg">
      <h1 className="text-lg font-black tracking-wider uppercase text-gray-900 mb-6"
          style={{ fontFamily: 'var(--font-alexandria)' }}>My Profile</h1>

      {/* Account */}
      <Card title="Account">
        <div className="space-y-1.5">
          {([
            ['Name',    info?.name],
            ['Company', info?.company],
            ['Email',   info?.email],
            ['Phone',   info?.telefono],
            ['Tax ID',  info?.nif_cif],
            info?.tipo_cliente ? ['Client type', info.tipo_cliente] : null,
          ] as ([string, string | null | undefined])[]).filter(Boolean).map(([label, value]) => (
            <div key={label} className={rowCls}>
              <span className={lblCls}>{label}</span>
              <span className={valCls}>{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Shipping address */}
      {addr && (
        <Card title="Shipping Address">
          <p className="text-sm text-gray-700">{addrLine ?? '—'}</p>
        </Card>
      )}

      {/* Security */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Security</span>
          <button
            onClick={() => { setShowPwdForm(v => !v); setFeedback(null); }}
            className="text-xs text-[#D93A35] font-semibold hover:underline"
          >
            {showPwdForm ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {!showPwdForm && (
          <div className="px-4 py-3 text-sm text-gray-400">
            Password is managed securely. Click "Change password" to update it.
          </div>
        )}

        {showPwdForm && (
          <form onSubmit={handleChangePassword} className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                New Password <span className="text-[#D93A35]">*</span>
              </label>
              <input
                type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters" className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                Confirm Password <span className="text-[#D93A35]">*</span>
              </label>
              <input
                type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password" className={inputCls}
              />
            </div>
            {feedback && (
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                feedback.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-[#0DA265]'
                  : 'bg-red-50 border border-red-200 text-[#D93A35]'
              }`}>
                {feedback.msg}
              </div>
            )}
            <button
              type="submit" disabled={saving}
              className="w-full py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
