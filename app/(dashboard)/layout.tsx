'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> ) },
  { href: '/pedidos', label: 'Orders', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> ) },
  { href: '/pedidos/nuevo', label: 'New Order', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg> ) },
  { href: '/clientes', label: 'Clients', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> ) },
  { href: '/tarifas', label: 'Pricing', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> ) },
  { href: '/produccion', label: 'Production', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20M6 20V10l6-6 6 6v10M10 20v-5h4v5"/></svg> ) },
  { href: '/catalogo', label: 'Catalog', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg> ) },
  { href: '/emails', label: 'Email', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg> ) },
  { href: '/usuarios', label: 'Team', icon: ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> ) },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const meta = session.user.user_metadata ?? {};
      const name = meta.full_name || session.user.email?.split('@')[0] || 'Admin';
      const role = meta.role === 'manager' ? 'Manager' : meta.role === 'viewer' ? 'Viewer' : 'Administrator';
      setUserInfo({ name, role });
    });
  }, []);

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
        
        {/* Logo Section */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex flex-col">
            {/* NEW LOGO */}
            <img src="/FR_ICON_B.svg" alt="Firma" className="w-[108px] h-auto" />
            <div className="mt-1 text-[13px] font-black tracking-[.22em] uppercase text-[#D93A35]"
                 style={{ fontFamily: "'Alexandria', sans-serif" }}>
              B2B
            </div>
          </div>
          {/* Close button for mobile inside sidebar */}
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-gray-100">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
             </svg>
          </button>
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
              (href === '/produccion' && pathname.startsWith('/produccion')) ||
              (href === '/catalogo' && pathname.startsWith('/catalogo'))                
              (href === '/emails' && pathname.startsWith('/emails')) ||
              (href === '/usuarios' && pathname.startsWith('/usuarios'));
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
              {userInfo
                ? userInfo.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                : '—'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12.5px] font-semibold text-gray-900 truncate">{userInfo?.name ?? '—'}</div>
              <div className="text-[11px] text-gray-400">{userInfo?.role ?? 'Administrator'}</div>
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
      
      {/* Hamburger - Hidden when sidebar is open */}
      {!sidebarOpen && (
        <button
          className="fixed top-3 left-3 z-[60] md:hidden bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}