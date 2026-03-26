'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { AdminRole } from '@/types';

interface AdminUser { id: string; email: string; full_name: string; role: AdminRole; created_at: string; last_sign_in_at: string | null; }

const ROLE_COLORS: Record<AdminRole, string> = { admin: '#D93A35', manager: '#0087B8', viewer: '#999' };
const ROLE_LABELS: Record<AdminRole, string> = { admin: 'Admin', manager: 'Manager', viewer: 'Viewer' };
const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: 'Full access — team, clients, orders, pricing',
  manager: 'Clients, orders and pricing — no team management',
  viewer: 'Read-only access to all sections',
};

const initials = (name: string) => (name || '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '—';

export default function UsuariosPage() {
  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null);
  const [showInvite, setShowInvite]   = useState(false);
  const [inviteName, setInviteName]   = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<AdminRole>('manager');
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent]   = useState(false);
  const [editUser, setEditUser]       = useState<AdminUser | null>(null);
  const [editRole, setEditRole]       = useState<AdminRole>('manager');
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) { setCurrentUserId(user.id); setCurrentRole(user.user_metadata?.role as AdminRole); }
      loadUsers();
    }
    init();
  }, [loadUsers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(''); setInviting(true); setInviteSent(false);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: inviteName, email: inviteEmail, role: inviteRole }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creating user');
      setInviteSent(true); setInviteName(''); setInviteEmail(''); setInviteRole('manager');
      loadUsers();
    } catch (err: any) { setInviteError(err.message); }
    finally { setInviting(false); }
  }

  async function handleEditRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError(''); setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: editRole }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error updating role');
      setEditUser(null); loadUsers();
    } catch (err: any) { setEditError(err.message); }
    finally { setEditSaving(false); }
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Remove ${user.full_name || user.email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) loadUsers();
  }

  const isAdmin = currentRole === 'admin';
  const inputSt: React.CSSProperties = { fontFamily: 'var(--font-main)', fontSize: 12, border: '1px solid #111', borderRadius: 0, padding: '7px 10px', background: '#fff', color: '#111', outline: 'none', width: '100%' };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Team</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Admin users and access levels</div>
        </div>
        {isAdmin && !showInvite && (
          <button className="btn-primary" onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(''); }}>
            + Invite Member
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-label">Invite Member</span>
            <button onClick={() => { setShowInvite(false); setInviteSent(false); setInviteError(''); }} style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#aaa', padding: '2px 6px', fontSize: 14 }}>✕</button>
          </div>

          {inviteSent ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#0DA265', fontWeight: 700, marginBottom: 12 }}>✓ Team member created — invite email sent.</div>
              <button onClick={() => { setShowInvite(false); setInviteSent(false); }} className="btn-ghost">Done</button>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="fr-invite-grid">
                <style>{`@media(max-width:480px){.fr-invite-grid{grid-template-columns:1fr!important}}`}</style>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Full Name *</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Maria García" style={inputSt} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Email *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="maria@firmarollers.com" style={inputSt} required />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Role</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['admin', 'manager', 'viewer'] as AdminRole[]).map((r) => (
                    <button key={r} type="button" onClick={() => setInviteRole(r)} style={{
                      padding: '8px 14px', background: inviteRole === r ? '#111' : '#fff',
                      color: inviteRole === r ? '#fff' : '#111', border: '1px solid #111',
                      boxShadow: inviteRole === r ? 'none' : '2px 2px 0 #111',
                      transform: inviteRole === r ? 'translate(2px,2px)' : 'none',
                      fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{ROLE_DESCRIPTIONS[inviteRole]}</div>
              </div>

              {inviteError && (
                <div style={{ padding: '8px 12px', background: '#fff8f8', border: '1px solid #D93A35', fontSize: 11, color: '#D93A35' }}>{inviteError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={inviting} className="btn-primary">{inviting ? 'Creating…' : 'Create & Send Invite'}</button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }} className="btn-ghost">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Users list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Member', 'Role', 'Last sign in', 'Joined', ...(isAdmin ? [''] : [])].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 5 : 4} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={isAdmin ? 5 : 4} style={{ padding: '48px 16px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>No team members yet</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, background: ROLE_COLORS[u.role] ?? '#555', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {initials(u.full_name || u.email)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                          {u.full_name || '—'}
                          {u.id === currentUserId && <span style={{ marginLeft: 6, fontSize: 9, color: '#aaa', fontWeight: 400 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span className="badge" style={{ background: ROLE_COLORS[u.role] ?? '#555' }}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Never'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '9px 14px' }}>
                      {u.id !== currentUserId && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditError(''); }} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', padding: 0, minHeight: 'auto' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(u)} style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D93A35', padding: 0, minHeight: 'auto' }}>
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit role modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 360, width: '100%', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-label">Edit Role</span>
              <button onClick={() => setEditUser(null)} style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#aaa', padding: '2px 6px', fontSize: 14 }}>✕</button>
            </div>
            <form onSubmit={handleEditRole} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{editUser.full_name || editUser.email}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(['admin', 'manager', 'viewer'] as AdminRole[]).map((r) => (
                  <button key={r} type="button" onClick={() => setEditRole(r)} style={{
                    padding: '10px 14px', background: editRole === r ? '#111' : '#fff',
                    color: editRole === r ? '#fff' : '#111', border: '1px solid #111',
                    boxShadow: editRole === r ? 'none' : '2px 2px 0 #111',
                    transform: editRole === r ? 'translate(2px,2px)' : 'none',
                    textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ROLE_LABELS[r]}</span>
                    <span style={{ fontSize: 9, fontWeight: 400, color: editRole === r ? '#ccc' : '#aaa', letterSpacing: 0, textTransform: 'none' }}>{ROLE_DESCRIPTIONS[r]}</span>
                  </button>
                ))}
              </div>
              {editError && <div style={{ padding: '8px 12px', background: '#fff8f8', border: '1px solid #D93A35', fontSize: 11, color: '#D93A35' }}>{editError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={editSaving || editRole === editUser.role} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
