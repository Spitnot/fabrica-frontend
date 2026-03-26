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
  { href: '/produccion', label: 'Production', group: 'Operations' },
  { href: '/catalogo',   label: 'Catalog',    group: 'Operations' },
  { href: '/emails',     label: 'Emails',     group: 'Admin' },
  { href: '/usuarios',   label: 'Team',       group: 'Admin' },
];

const GROUPS = ['Main', 'Operations', 'Admin'];

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
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/pedidos') return pathname.startsWith('/pedidos') && !pathname.startsWith('/pedidos/nuevo');
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #111' }}>
        <Link href="/dashboard" onClick={onClose}>
          <FRLogoSVG width={88} />
        </Link>
        <div style={{ marginTop: 6, fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#bbb', borderTop: '1px solid #eee', paddingTop: 5 }}>
          B2B Platform
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {GROUPS.map((group) => (
          <div key={group}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ccc', padding: '10px 8px 3px' }}>
              {group}
            </div>
            {NAV_ITEMS.filter((i) => i.group === group).map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 9px', marginBottom: 1,
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: active ? '#fff' : '#666',
                    background: active ? '#111' : 'transparent',
                    border: `1px solid ${active ? '#111' : 'transparent'}`,
                    textDecoration: 'none', minHeight: 44,
                  }}
                >
                  <span style={{ width: 7, height: 7, flexShrink: 0, border: `1.5px solid ${active ? '#D93A35' : 'currentColor'}`, background: active ? '#D93A35' : 'transparent' }} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        style={{ padding: '12px 13px', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', minHeight: 52 }}
      >
        <div style={{ width: 28, height: 28, background: '#D93A35', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
          {userInfo ? initials(userInfo.name) : '—'}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#111', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userInfo?.name ?? '—'}
          </div>
          <div style={{ fontSize: 9, color: '#aaa' }}>{userInfo?.role ?? 'Administrator'}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
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

      {/* Sidebar spacer en desktop */}
      <div className="fr-sidebar-spacer" style={{ width: 210, flexShrink: 0, display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, pointerEvents: 'none' }} />

      {/* Sidebar */}
      <aside className="fr-sidebar" style={{
        width: 210, background: '#fff', borderRight: '1px solid #111',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }}>
        <SidebarInner onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Layout wrapper */}
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fr-cream)' }}>
        {/* Spacer para empujar contenido en desktop */}
        <div style={{ width: 210, flexShrink: 0, display: 'none' }} className="fr-sidebar-spacer" />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Topbar móvil — sticky, nunca tapa el contenido */}
          <div className="fr-mobile-topbar" style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: '#fff', borderBottom: '1px solid #111',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '4px', color: '#111', display: 'flex', alignItems: 'center', minHeight: 44, minWidth: 44, justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <Link href="/dashboard">
              <FRLogoSVG width={60} />
            </Link>
          </div>

          {/* Contenido */}
          <main style={{ flex: 1, overflowX: 'hidden' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
