'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function PerfilPage() {
  const [userInfo, setUserInfo] = useState<{ name: string; company: string; email: string } | null>(null);

  // Password change form
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
        .select('contacto_nombre, company_name, email')
        .eq('auth_user_id', session.user.id)
        .single();
      if (cust) setUserInfo({ name: cust.contacto_nombre, company: cust.company_name, email: cust.email });
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
    }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7 max-w-lg">
      <h1 className="text-lg font-black tracking-wider uppercase text-gray-900 mb-6"
          style={{ fontFamily: 'var(--font-alexandria)' }}>My Profile</h1>

      {/* Account info */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Account</span>
        </div>
        <div className="p-4 space-y-2">
          {[
            ['Name',    userInfo?.name    ?? '—'],
            ['Company', userInfo?.company ?? '—'],
            ['Email',   userInfo?.email   ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="font-mono text-xs text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-alexandria)' }}>Change Password</span>
        </div>
        <form onSubmit={handleChangePassword} className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
              New Password <span className="text-[#D93A35]">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
              Confirm Password <span className="text-[#D93A35]">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className={inputCls}
              required
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
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
