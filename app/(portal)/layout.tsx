'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

// ─── Logo completo FIRMA ROLLERS ────────────────────────────────────────────
const FirmaLogo = ({ width = 120 }: { width?: number }) => (
  <svg viewBox="0 0 216 81.63" xmlns="http://www.w3.org/2000/svg" fill="#111"
    style={{ width, height: 'auto', display: 'block' }}>
    <path d="M.03.16h30.48l-.06,8.38H10.67v9.25h18.26v8.32H10.67v14.83H.03V.16Z"/>
    <path d="M102.05,40.93l-8.52-13.37c1.06-.55,2.03-1.19,2.88-1.96,2.95-2.65,4.42-6.37,4.42-11.14s-1.47-8.05-4.42-10.56c-2.95-2.5-7.14-3.75-12.56-3.75h-18.32v40.77h10.64v-11.34h7.68c.06,0,.12,0,.19,0l5.98,11.35h12.04ZM76.17,8.53h7.68c2.21,0,3.9.52,5.09,1.57,1.18,1.05,1.77,2.6,1.77,4.65s-.59,3.74-1.77,4.83c-1.19,1.08-2.88,1.63-5.09,1.63h-7.68v-12.68Z"/>
    <path d="M113.45.16h11.58l11.81,24.02L148.58.16h11.58v40.77h-9.43l-.06-26.12-10.41,22.04h-6.86l-10.47-22.04v26.12h-9.48V.16Z"/>
    <path d="M203.84,40.93h11.34L198.08.16h-10.93l-17.51,40.77h10.94l2.86-7.33h17.61l2.8,7.33ZM186.56,25.57l5.76-14.77,5.65,14.77h-11.41Z"/>
    <path d="M24.66,81.29l-6.74-10.04c1.18-.45,2.22-1.06,3.1-1.84,2.09-1.86,3.14-4.47,3.14-7.83s-1.05-5.71-3.14-7.49c-2.09-1.78-5.06-2.67-8.9-2.67H0v29.86h5.03v-9.08h7.08c.46,0,.9-.02,1.33-.04l5.5,9.13h5.71ZM5.03,67.89v-12.16h7.08c2.31,0,4.09.49,5.35,1.47,1.26.98,1.9,2.48,1.9,4.5s-.63,3.66-1.9,4.67c-1.26,1.01-3.05,1.51-5.35,1.51h-7.08Z"/>
    <path d="M48.46,51.13c2.22,0,4.29.38,6.21,1.15s3.6,1.85,5.03,3.24c1.44,1.39,2.56,3.01,3.37,4.84.81,1.83,1.22,3.82,1.22,5.95s-.41,4.13-1.22,5.99c-.81,1.86-1.94,3.49-3.37,4.88-1.44,1.39-3.11,2.48-5.03,3.26s-3.99,1.17-6.21,1.17-4.29-.39-6.21-1.17-3.6-1.87-5.03-3.26c-1.44-1.39-2.56-3.02-3.37-4.88-.81-1.86-1.22-3.86-1.22-5.99s.41-4.12,1.22-5.97c.81-1.85,1.94-3.46,3.37-4.84,1.44-1.38,3.11-2.45,5.03-3.22,1.92-.77,3.99-1.15,6.21-1.15ZM48.5,55.4c-1.48,0-2.86.28-4.16.83s-2.44,1.33-3.43,2.33c-1,.99-1.77,2.15-2.33,3.48-.55,1.32-.83,2.75-.83,4.29s.28,2.97.85,4.31c.57,1.34,1.35,2.51,2.34,3.52,1,1.01,2.14,1.8,3.43,2.37,1.3.57,2.67.85,4.12.85s2.82-.28,4.12-.85c1.3-.57,2.42-1.36,3.39-2.37.97-1.01,1.73-2.18,2.28-3.52.56-1.34.83-2.77.83-4.31s-.28-2.97-.83-4.29c-.55-1.32-1.31-2.48-2.28-3.48-.97-1-2.1-1.77-3.39-2.33-1.3-.55-2.67-.83-4.12-.83Z"/>
    <path d="M73.92,51.43h5.03v25.55h12.92v4.31h-17.96v-29.86Z"/>
    <path d="M100.96,51.43h5.03v25.55h12.92v4.31h-17.96v-29.86Z"/>
    <path d="M128.01,51.43h21.33v4.31h-16.29v8.4h14.59v4.27h-14.59v8.57h16.81v4.31h-21.84v-29.86Z"/>
    <path d="M184.91,81.29l-6.74-10.04c1.18-.45,2.22-1.06,3.1-1.84,2.09-1.86,3.14-4.47,3.14-7.83s-1.05-5.71-3.14-7.49-5.06-2.67-8.9-2.67h-12.11v29.86h5.03v-9.08h7.08c.46,0,.9-.02,1.33-.04l5.5,9.13h5.71ZM165.28,67.89v-12.16h7.08c2.31,0,4.09.49,5.35,1.47,1.26.98,1.9,2.48,1.9,4.5s-.63,3.66-1.9,4.67-3.05,1.51-5.35,1.51h-7.08Z"/>
    <path d="M213.53,58.34c-1.08-.68-2.15-1.22-3.2-1.62-1.05-.4-2.05-.68-2.99-.85-.94-.17-1.79-.26-2.56-.26-1.48,0-2.66.28-3.54.85-.88.57-1.32,1.39-1.32,2.47,0,.97.29,1.76.87,2.37.58.61,1.35,1.11,2.31,1.49.95.38,2,.75,3.15,1.09,1.15.34,2.3.72,3.43,1.13,1.14.41,2.19.94,3.16,1.6.97.66,1.73,1.49,2.3,2.5.57,1.01.85,2.28.85,3.82,0,1.76-.48,3.29-1.45,4.58-.97,1.3-2.29,2.3-3.99,3.01-1.69.71-3.63,1.07-5.82,1.07-1.56,0-3.09-.21-4.56-.62-1.48-.41-2.87-.97-4.16-1.69-1.3-.71-2.45-1.54-3.48-2.47l2.17-4.14c1.03.94,2.11,1.74,3.26,2.39,1.15.66,2.32,1.15,3.5,1.49,1.18.34,2.29.51,3.35.51,1.76,0,3.14-.34,4.12-1.02.98-.68,1.47-1.63,1.47-2.86,0-1-.29-1.8-.87-2.41-.58-.61-1.35-1.12-2.31-1.51-.95-.4-2-.75-3.15-1.07-1.15-.31-2.3-.68-3.46-1.09-1.15-.41-2.2-.93-3.15-1.56-.95-.62-1.72-1.44-2.3-2.43-.58-.99-.87-2.26-.87-3.8,0-1.68.45-3.14,1.36-4.37.91-1.24,2.18-2.2,3.82-2.88,1.64-.68,3.53-1.02,5.7-1.02,1.94,0,3.81.28,5.63.85,1.82.57,3.43,1.31,4.82,2.22l-2.09,4.22Z"/>
  </svg>
);

const NAV = [
  {
    href: '/portal',
    label: 'Orders',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    ),
  },
  {
    href: '/portal/pedidos/nuevo',
    label: 'New Order',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
      </svg>
    ),
  },
  {
    href: '/portal/perfil',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
];

function useActiveNav(pathname: string) {
  return (href: string) => {
    if (href === '/portal') return pathname === '/portal' || (pathname.startsWith('/portal/pedidos/') && !pathname.startsWith('/portal/pedidos/nuevo'));
    return pathname === href || pathname.startsWith(href + '/');
  };
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = useActiveNav(pathname);
  const [userInfo, setUserInfo] = useState<{ name: string; company: string } | null>(null);

  useEffect(() => {
    fetch('/api/portal/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) setUserInfo({ name: data.contacto_nombre, company: data.company_name });
      });
  }, []);

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push('/login');
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #111' }}>
        <Link href="/portal" onClick={onClose}>
          <FirmaLogo width={110} />
        </Link>
        <div style={{ marginTop: 8, fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D93A35', borderTop: '1px solid #eee', paddingTop: 6 }}>
          Customer Portal
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ccc', padding: '4px 8px 8px' }}>
          My Account
        </div>
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', minHeight: 48,
                fontSize: 12, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                color: active ? '#fff' : '#666',
                background: active ? '#111' : 'transparent',
                border: `1px solid ${active ? '#111' : 'transparent'}`,
                textDecoration: 'none',
              }}
            >
              <span style={{ color: active ? '#D93A35' : '#aaa', flexShrink: 0 }}>
                {icon(active)}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid #111' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', boxShadow: 'none',
            cursor: 'pointer', width: '100%', textAlign: 'left', minHeight: 56,
            fontFamily: 'var(--font-main)',
          }}
        >
          <div style={{ width: 30, height: 30, background: '#D93A35', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {userInfo ? initials(userInfo.name) : 'C'}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userInfo?.name ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: '#aaa' }}>{userInfo?.company ?? 'Customer'}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const isActive = useActiveNav(pathname);

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: '#fff', borderTop: '1px solid #111',
      display: 'flex', height: 60,
    }}>
      {NAV.map(({ href, label, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              textDecoration: 'none',
              color: active ? '#D93A35' : '#aaa',
              background: active ? '#f7f7f2' : 'transparent',
              borderRight: '1px solid #f0f0f0',
              minHeight: 60,
            }}
          >
            {icon(active)}
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .fr-portal-sidebar { transform: translateX(0) !important; }
          .fr-portal-spacer  { display: block !important; }
          .fr-portal-bottomnav { display: none !important; }
          .fr-portal-main { padding-bottom: 0 !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="fr-portal-sidebar" style={{
        width: 220, background: '#fff', borderRight: '1px solid #111',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }}>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Layout */}
      <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
        <div className="fr-portal-spacer" style={{ width: 220, flexShrink: 0, display: 'none' }} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Topbar móvil — fina, solo logo + menú */}
          <div className="fr-portal-bottomnav" style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: '#fff', borderBottom: '1px solid #111',
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Link href="/portal">
              <FirmaLogo width={80} />
            </Link>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 6, color: '#111', display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          </div>

          <main className="fr-portal-main" style={{ flex: 1, overflowX: 'hidden', paddingBottom: 60 }}>
            {children}
          </main>

          {/* Bottom nav móvil */}
          <div className="fr-portal-bottomnav">
            <BottomNav />
          </div>
        </div>
      </div>
    </>
  );
}
