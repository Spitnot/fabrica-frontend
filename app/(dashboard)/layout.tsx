'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/pedidos',
    label: 'Orders',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    ),
  },
  {
    href: '/pedidos/nuevo',
    label: 'New Order',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
      </svg>
    ),
  },
  {
    href: '/clientes',
    label: 'Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/tarifas',
    label: 'Pricing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: '/catalogo',
    label: 'Catalog',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
      </svg>
    ),
  },
];

const FirmaLogo = () => (
  <svg viewBox="0 0 216 81.63" xmlns="http://www.w3.org/2000/svg" fill="#111111" className="w-[108px] h-auto">
    <path d="M.03.16h30.48l-.06,8.38H10.67v9.25h18.26v8.32H10.67v14.83H.03V.16Z"/>
    <path d="M102.05,40.93l-8.52-13.37c1.06-.55,2.03-1.19,2.88-1.96,2.95-2.65,4.42-6.37,4.42-11.14s-1.47-8.05-4.42-10.56c-2.95-2.5-7.14-3.75-12.56-3.75h-18.32v40.77h10.64v-11.34h7.68c.06,0,.12,0,.19,0l5.98,11.35h12.04ZM76.17,8.53h7.68c2.21,0,3.9.52,5.09,1.57,1.18,1.05,1.77,2.6,1.77,4.65s-.59,3.74-1.77,4.83c-1.19,1.08-2.88,1.63-5.09,1.63h-7.68v-12.68Z"/>
    <path d="M113.45.16h11.58l11.81,24.02L148.58.16h11.58v40.77h-9.43l-.06-26.12-10.41,22.04h-6.86l-10.47-22.04v26.12h-9.48V.16Z"/>
    <path d="M203.84,40.93h11.34L198.08.16h-10.93l-17.51,40.77h10.94l2.86-7.33h17.61l2.8,7.33ZM186.56,25.57l5.76-14.77,5.65,14.77h-11.41Z"/>
    <path d="M24.66,81.29l-6.74-10.04c1.18-.45,2.22-1.06,3.1-1.84,2.09-1.86,3.14-4.47,3.14-7.83s-1.05-5.71-3.14-7.49c-2.09-1.78-5.06-2.67-8.9-2.67H0v29.86h5.03v-9.08h7.08c.46,0,.9-.02,1.33-.04l5.5,9.13h5.71ZM5.03,67.89v-12.16h7.08c2.31,0,4.09.49,5.35,1.47,1.26.98,1.9,2.48,1.9,4.5s-.63,3.66-1.9,4.67c-1.26,1.01-3.05,1.51-5.35,1.51h-7.08Z"/>
    <path d="M48.46,51.13c2.22,0,4.29.38,6.21,1.15,1.92.77,3.6,1.85,5.03,3.24,1.44,1.39,2.56,3.01,3.37,4.84.81,1.83,1.22,3.82,1.22,5.95s-.41,4.13-1.22,5.99c-.81,1.86-1.94,3.49-3.37,4.88-1.44,1.39-3.11,2.48-5.03,3.26s-3.99,1.17-6.21,1.17-4.29-.39-6.21-1.17c-1.92-.78-3.6-1.87-5.03-3.26-1.44-1.39-2.56-3.02-3.37-4.88-.81-1.86-1.22-3.86-1.22-5.99s.41-4.12,1.22-5.97c.81-1.85,1.94-3.46,3.37-4.84,1.44-1.38,3.11-2.45,5.03-3.22,1.92-.77,3.99-1.15,6.21-1.15ZM48.5,55.4c-1.48,0-2.86.28-4.16.83s-2.44,1.33-3.43,2.33c-1,.99-1.77,2.15-2.33,3.48-.55,1.32-.83,2.75-.83,4.29s.28,2.97.85,4.31c.57,1.34,1.35,2.51,2.34,3.52,1,1.01,2.14,1.8,3.43,2.37,1.3.57,2.67.85,4.12.85s2.82-.28,4.12-.85c1.3-.57,2.42-1.36,3.39-2.37.97-1.01,1.73-2.18,2.28-3.52.56-1.34.83-2.77.83-4.31s-.28-2.97-.83-4.29c-.55-1.32-1.31-2.48-2.28-3.48-.97-1-2.1-1.77-3.39-2.33-1.3-.55-2.67-.83-4.12-.83Z"/>
    <path d="M73.92,51.43h5.03v25.55h12.92v4.31h-17.96v-29.86Z"/>
    <path d="M100.96,51.43h5.03v25.55h12.92v4.31h-17.96v-29.86Z"/>
    <path d="M128.01,51.43h21.33v4.31h-16.29v8.4h14.59v4.27h-14.59v8.57h16.81v4.31h-21.84v-29.86Z"/>
    <path d="M184.91,81.29l-6.74-10.04c1.18-.45,2.22-1.06,3.1-1.84,2.09-1.86,3.14-4.47,3.14-7.83s-1.05-5.71-3.14-7.49c-2.09-1.78-5.06-2.67-8.9-2.67h-12.11v29.86h5.03v-9.08h7.08c.46,0,.9-.02,1.33-.04l5.5,9.13h5.71ZM165.28,67.89v-12.16h7.08c2.31,0,4.09.49,5.35,1.47,1.26.98,1.9,2.48,1.9,4.5s-.63,3.66-1.9,4.67c-1.26,1.01-3.05,1.51-5.35,1.51h-7.08Z"/>
    <path d="M213.53,58.34c-1.08-.68-2.15-1.22-3.2-1.62-1.05-.4-2.05-.68-2.99-.85-.94-.17-1.79-.26-2.56-.26-1.48,0-2.66.28-3.54.85-.88.57-1.32,1.39-1.32,2.47,0,.97.29,1.76.87,2.37.58.61,1.35,1.11,2.31,1.49.95.38,2,.75,3.15,1.09,1.15.34,2.3.72,3.43,1.13,1.14.41,2.19.94,3.16,1.6.97.66,1.73,1.49,2.3,2.5.57,1.01.85,2.28.85,3.82,0,1.76-.48,3.29-1.45,4.58-.97,1.3-2.29,2.3-3.99,3.01-1.69.71-3.63,1.07-5.82,1.07-1.56,0-3.09-.21-4.56-.62-1.48-.41-2.87-.97-4.16-1.69-1.3-.71-2.45-1.54-3.48-2.47l2.17-4.14c1.03.94,2.11,1.74,3.26,2.39,1.15.66,2.32,1.15,3.5,1.49,1.18.34,2.29.51,3.35.51,1.76,0,3.14-.34,4.12-1.02.98-.68,1.47-1.63,1.47-2.86,0-1-.29-1.8-.87-2.41-.58-.61-1.35-1.12-2.31-1.51-.95-.4-2-.75-3.15-1.07-1.15-.31-2.3-.68-3.46-1.09-1.15-.41-2.2-.93-3.15-1.56-.95-.62-1.72-1.44-2.3-2.43-.58-.99-.87-2.26-.87-3.8,0-1.68.45-3.14,1.36-4.37.91-1.24,2.18-2.2,3.82-2.88,1.64-.68,3.53-1.02,5.7-1.02,1.94,0,3.81.28,5.63.85,1.82.57,3.43,1.31,4.82,2.22l-2.09,4.22Z"/>
    <path d="M51.95,41.04l-11.55-.15c0-4.1,1.91-6.46,2.94-7.73.15-.19.31-.36.44-.57-.13.09-.29-.09-.44-.28-1.03-1.27-2.94-3.64-2.94-7.73s1.91-6.46,2.94-7.73c.15-.18.31-.36.44-.57-.13.11-.3-.08-.44-.26-1.03-1.27-2.94-3.64-2.94-7.73s1.91-6.46,2.94-7.73c.15-.18.31-.36.44-.57l11.55.16c0,4.09-1.91,6.46-2.94,7.73-.15.18-.31.36-.44.57.12-.1.29.06.44.25,1.03,1.27,2.94,3.64,2.94,7.73s-1.91,6.46-2.94,7.73c-.15.19-.31.36-.44.57.14-.09.29.08.44.27,1.03,1.27,2.94,3.64,2.94,7.73s-1.91,6.46-2.94,7.73c-.15.19-.31.36-.44.57Z"/>
  </svg>
);

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50
        w-[220px] bg-white border-r border-gray-200
        flex flex-col transition-transform duration-250
        md:translate-x-0 md:static md:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-5 pt-5 pb-4 border-b border-gray-200">
          <FirmaLogo />
          <div className="mt-2 text-[13px] font-black tracking-[.22em] uppercase text-[#D93A35]"
               style={{ fontFamily: "'Alexandria', sans-serif" }}>
            B2B
          </div>
        </div>

        <nav className="flex-1 py-3 px-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-2 py-2 pb-1 text-[9px] tracking-[.14em] uppercase text-gray-400 font-bold">
            Main
          </div>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href ||
              (href === '/pedidos' && pathname.startsWith('/pedidos') && !pathname.startsWith('/pedidos/nuevo')) ||
              (href === '/clientes' && pathname.startsWith('/clientes')) ||
              (href === '/tarifas' && pathname.startsWith('/tarifas')) ||
              (href === '/catalogo' && pathname.startsWith('/catalogo'));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all
                  ${active
                    ? 'bg-red-50 text-[#D93A35]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <span className={active ? 'text-[#D93A35]' : 'text-gray-400'}>
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 px-3 py-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-md bg-[#D93A35] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              IA
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12.5px] font-semibold text-gray-900 truncate">Isaac A.</div>
              <div className="text-[11px] text-gray-400">Administrator</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-900">
      <button
        className="fixed top-3 left-3 z-[60] md:hidden bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
        onClick={() => setSidebarOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
