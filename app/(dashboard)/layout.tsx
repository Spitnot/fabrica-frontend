'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  group: 'Main' },
  { href: '/pedidos',    label: 'Orders',     group: 'Main' },
  { href: '/clientes',   label: 'Clients',    group: 'Main' },
  { href: '/tarifas',    label: 'Pricing',    group: 'Main' },
  { href: '/produccion', label: 'Production', group: 'Ops' },
  { href: '/catalogo',   label: 'Catalog',    group: 'Ops' },
  { href: '/emails',     label: 'Emails',     group: 'Admin' },
  { href: '/usuarios',   label: 'Team',       group: 'Admin' },
  { href: '/company',    label: 'Company',    group: 'Admin' },
];

const GROUPS = ['Main', 'Ops', 'Admin'];

const FRLogoSVG = ({ width = 88 }: { width?: number }) => (
  <svg viewBox="0 0 133.16 43.48" xmlns="http://www.w3.org/2000/svg" style={{ width, height: 'auto', display: 'block' }}>
    <path fill="#111" d="M94.94,0c-11.92,0-18.81,5.57-22.51,8.57-.52.42-1.08.89-.74,1.28-.62-.37-1.13-.85-1.66-1.28-3.7-3-10.59-8.57-22.51-8.57s-18.82,5.57-22.52,8.56c-.53.44-1.07.9-.81,1.28-.62-.36-1.13-.84-1.67-1.28C18.82,5.57,11.93,0,0,0v33.92c.44.31.83.66,1.24,1,3.7,2.99,10.59,8.56,22.52,8.56s18.82-5.57,22.52-8.56c.54-.44,1.03-.89.78-1.29.62.36,1.12.85,1.66,1.28,3.7,3,10.59,8.57,22.52,8.57s18.82-5.58,22.52-8.57c.55-.44,1.04-.93.73-1.28.62.36,1.12.85,1.65,1.28,3.71,3,10.59,8.57,22.52,8.57V9.55c-.42-.31-.8-.66-1.2-.98-3.71-3-10.59-8.57-22.52-8.57h0Z"/>
    <path fill="#111" d="M129.87,39.05c.33-.3.49-.71.49-1.23s-.16-.9-.49-1.17-.79-.4-1.4-.4h-1.96v4.51h1.15v-1.26h.85l.67,1.27h1.32l-.98-1.51c.12-.06.25-.11.35-.2h0ZM127.67,37.13h.81c.25,0,.45.06.58.19.13.13.2.31.2.53s-.07.42-.2.55-.33.2-.58.2h-.81v-1.47Z"/>
    <path fill="#111" d="M132.78,36.78c-.25-.58-.59-1.09-1.02-1.53s-.94-.79-1.52-1.04-1.21-.38-1.88-.38-1.31.13-1.89.38-.58.26-1.09.61-1.52,1.05-.78.96-1.02,1.55-.37,1.21-.37,1.86.12,1.27.36,1.85.58,1.09,1.01,1.54c.43.44.94.79,1.53,1.04.58.25,1.21.38,1.88.38s1.31-.13,1.89-.38.58-.26,1.09-.6,1.53-1.05c.44-.44.78-.96,1.03-1.55.24-.59.37-1.21.37-1.86s-.12-1.28-.37-1.87h-.01ZM131.72,40.06c-.18.44-.44.83-.78,1.17-.34.34-.73.6-1.17.79s-.93.29-1.45.29-.99-.09-1.43-.28-.83-.45-1.16-.79c-.33-.34-.58-.72-.77-1.16s-.27-.91-.27-1.41.09-.97.28-1.42c.18-.44.44-.83.77-1.17.33-.34.71-.6,1.16-.79.44-.19.93-.29,1.45-.29s.99.09,1.43.28.83.45,1.16.79c.33.34.59.72.77,1.16s.28.91.28,1.41-.09.97-.28,1.42h.01Z"/>
  </svg>
);

function SidebarInner({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata ?? {};
      const name = meta.full_name || user.email?.split('@')[0] || 'Admin';
      const roleMap: Record<string, string> = { admin: 'Administrator', manager: 'Manager', viewer: 'Viewer' };
      setUserInfo({ name, role: roleMap[meta.role] ?? 'Administrator' });
    });
  }, []);

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push('/login');
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/pedidos') return pathname.startsWith('/pedidos') && !pathname.startsWith('/pedidos/nuevo');
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #111' }}>
        <Link href="/dashboard" onClick={onClose}>
          <FRLogoSVG width={88} />
        </Link>
        <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', borderTop: '1px solid #111', paddingTop: 6 }}>
          B2B Platform
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {GROUPS.map(group => (
          <div key={group} style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', padding: '4px 8px 6px' }}>
              {group}
            </div>
            {NAV_ITEMS.filter(i => i.group === group).map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', marginBottom: 1,
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    letterSpacing: '0.03em',
                    color: active ? '#111' : '#666',
                    background: active ? '#F7F7F2' : 'transparent',
                    borderLeft: active ? '2px solid #D93A35' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid #111' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', boxShadow: 'none',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div style={{
            width: 28, height: 28, background: '#111', color: '#F6E451',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, flexShrink: 0,
          }}>
            {userInfo ? initials(userInfo.name) : '—'}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userInfo?.name ?? '—'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#999' }}>{userInfo?.role ?? 'Administrator'}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .fr-sidebar { transform: translateX(0) !important; }
          .fr-sidebar-spacer { display: block !important; }
          .fr-mobile-topbar { display: none !important; }
        }
      `}</style>

      <aside className="fr-sidebar" style={{
        width: 220, background: '#fff', borderRight: '1px solid #111',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }}>
        <SidebarInner onClose={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }} />
      )}

      <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
        <div className="fr-sidebar-spacer" style={{ width: 220, flexShrink: 0, display: 'none' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Mobile topbar */}
          <div className="fr-mobile-topbar" style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: '#fff', borderBottom: '1px solid #111',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 4, color: '#111', display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <Link href="/dashboard"><FRLogoSVG width={60} /></Link>
          </div>

          <main style={{ flex: 1, overflowX: 'hidden' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
