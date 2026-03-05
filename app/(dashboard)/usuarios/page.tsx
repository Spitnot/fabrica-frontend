'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/emailService'; // NEW IMPORT
import type { AdminRole } from '@/types';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_STYLES: Record<AdminRole, string> = {
  admin:   'text-[#D93A35] bg-red-50 border-red-200',
  manager: 'text-[#0087B8] bg-blue-50 border-blue-200',
  viewer:  'text-gray-600 bg-gray-100 border-gray-200',
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin:   'Admin',
  manager: 'Manager',
  viewer:  'Viewer',
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin:   'Full access — can manage team, clients, orders, and pricing',
  manager: 'Can manage clients, orders, and pricing — cannot manage team',
  viewer:  'Read-only access to all sections',
};

export default function UsuariosPage() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole]     = useState<AdminRole | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('manager');
  const [inviting, setInviting]     = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [setupLink, setSetupLink]   = useState('');
  const [copied, setCopied]         = useState(false);

  // Edit role modal
  const [editUser, setEditUser]     = useState<AdminUser | null>(null);
  const [editRole, setEditRole]     = useState<AdminRole>('manager');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setCurrentRole(session.user.user_metadata?.role as AdminRole);
      }
      loadUsers();
    }
    init();
  }, [loadUsers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(''); setInviting(true); setSetupLink('');
    
    try {
      // 1. Create user via API
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: inviteName, email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating user');
      
      const link = data.setup_link ?? '';
      setSetupLink(link);

      // 2. Send Welcome Email via Resend
      if (link) {
        const htmlContent = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2 style="color: #D93A35;">Welcome to Fabrica!</h2>
            <p>Hello ${inviteName},</p>
            <p>You have been invited to join the Fabrica Dashboard as a <strong>${ROLE_LABELS[inviteRole]}</strong>.</p>
            <p>Please click the button below to set up your password and access your account:</p>
            <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #D93A35; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
              Set Password & Access Dashboard
            </a>
            <p style="font-size: 12px; color: #999;">This link expires in 24 hours.</p>
          </div>
        `;
        
        await sendEmail(inviteEmail, 'Welcome to Fabrica - Set Your Password', htmlContent);
        // Optionally alert if email fails, but we show the link anyway as backup
      }

      setInviteName(''); setInviteEmail(''); setInviteRole('manager');
      loadUsers();
    } catch (err: any) { setInviteError(err.message); }
    finally { setInviting(false); }
  }

  async function handleEditRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError(''); setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error updating role');
      setEditUser(null);
      loadUsers();
    } catch (err: any) { setEditError(err.message); }
    finally { setEditSaving(false); }
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Remove ${user.full_name || user.email} from the team? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) loadUsers();
  }

  function copyLink() {
    navigator.clipboard.writeText(setupLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isAdmin = currentRole === 'admin';
  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>
            Team
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin users and access levels</p>
        </div>
        {isAdmin && !showInvite && (
          <button
            onClick={() => { setShowInvite(true); setSetupLink(''); setInviteError(''); }}
            className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors"
          >
            + Invite member
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
                  style={{ fontFamily: 'var(--font-alexandria)' }}>Invite member</span>
            <button onClick={() => { setShowInvite(false); setSetupLink(''); setInviteError(''); }}
                    className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>

          {setupLink ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#0DA265] text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Team member created. An email has been sent.
              </div>
              <div className="flex gap-2">
                <input readOnly value={setupLink}
                       className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 outline-none" />
                <button onClick={copyLink}
                        className="px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Backup link (also sent via email). Expires in 24 hours.
              </p>
              <button onClick={() => { setShowInvite(false); setSetupLink(''); }}
                      className="text-sm font-semibold text-[#D93A35] hover:underline">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                    Full Name <span className="text-[#D93A35]">*</span>
                  </label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                         placeholder="Maria García" className={inputCls} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                    Email <span className="text-[#D93A35]">*</span>
                  </label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                         placeholder="maria@firmarollers.com" className={inputCls} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['admin', 'manager', 'viewer'] as AdminRole[]).map((r) => (
                    <button key={r} type="button" onClick={() => setInviteRole(r)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              inviteRole === r
                                ? 'border-[#D93A35]/50 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}>
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">{ROLE_LABELS[r]}</div>
                      <div className="text-[11px] text-gray-400 leading-tight">{ROLE_DESCRIPTIONS[r]}</div>
                    </button>
                  ))}
                </div>
              </div>
              {inviteError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">
                  {inviteError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={inviting}
                        className="px-5 py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                  {inviting ? 'Creating…' : 'Create & Send Invite'}
                </button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }}
                        className="px-5 py-2 border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-50">
                {['Member', 'Role', 'Last sign in', 'Joined', ...(isAdmin ? [''] : [])].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <div className="w-4 h-4 border border-gray-200 border-t-[#D93A35] rounded-full animate-spin" />
                      Loading team…
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-5 py-10 text-center text-sm text-gray-400">
                    No team members yet
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[#D93A35] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                          {(u.full_name || u.email).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {u.full_name || '—'}
                            {u.id === currentUserId && (
                              <span className="ml-1.5 text-[10px] font-bold text-gray-400">(you)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border rounded-md ${ROLE_STYLES[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3">
                        {u.id !== currentUserId && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditError(''); }}
                                    className="text-xs font-semibold text-gray-400 hover:text-[#D93A35] transition-colors">
                              Edit role
                            </button>
                            <button onClick={() => handleDelete(u)}
                                    className="text-xs font-semibold text-gray-400 hover:text-[#D93A35] transition-colors">
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role descriptions reference */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['admin', 'manager', 'viewer'] as AdminRole[]).map((r) => (
          <div key={r} className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold border rounded mb-1.5 ${ROLE_STYLES[r]}`}>
              {ROLE_LABELS[r]}
            </span>
            <p className="text-[11px] text-gray-400 leading-tight">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      {/* Edit role modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-wider text-gray-900">Edit Role</span>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleEditRole} className="p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">{editUser.full_name || editUser.email}</div>
                <div className="text-xs text-gray-400">{editUser.email}</div>
              </div>
              <div className="space-y-2">
                {(['admin', 'manager', 'viewer'] as AdminRole[]).map((r) => (
                  <button key={r} type="button" onClick={() => setEditRole(r)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors ${
                            editRole === r
                              ? 'border-[#D93A35]/50 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                    <div className="text-sm font-semibold text-gray-900">{ROLE_LABELS[r]}</div>
                    <div className="text-[11px] text-gray-400">{ROLE_DESCRIPTIONS[r]}</div>
                  </button>
                ))}
              </div>
              {editError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">
                  {editError}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={editSaving || editRole === editUser.role}
                        className="flex-1 py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditUser(null)}
                        className="flex-1 py-2 border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:border-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}