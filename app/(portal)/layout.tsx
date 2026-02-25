'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function PortalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push('/login');
  }

  const navItems = [
    { href: '/portal', label: 'My Orders', icon: '▪' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-[220px] min-w-[220px] bg-white border-r border-gray-200
        flex flex-col h-full
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 100 Q50 20 100 60 Q150 100 180 40" stroke="#D93A35" strokeWidth="18" strokeLinecap="round" fill="none"/>
              <path d="M20 130 Q50 50 100 90 Q150 130 180 70" stroke="#E6883E" strokeWidth="14" strokeLinecap="round" fill="none"/>
              <path d="M20 160 Q50 80 100 120 Q150 160 180 100" stroke="#F6E451" strokeWidth="10" strokeLinecap="round" fill="none"/>
            </svg>
            <div>
              <div className="text-[13px] font-black tracking-widest text-gray-900 leading-none"
                   style={{ fontFamily: 'var(--font-alexandria)' }}>FIRMA ROLLERS</div>
              <div className="text-[9px] font-black tracking-[0.2em] text-[#D93A35] mt-0.5"
                   style={{ fontFamily: 'var(--font-alexandria)' }}>CUSTOMER PORTAL</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          <div className="px-5 py-2 text-[9px] tracking-[0.18em] uppercase text-gray-400 font-bold mb-1">
            My Account
          </div>
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-[13px] border-l-2 transition-all ${
                  active
                    ? 'text-[#D93A35] border-[#D93A35] bg-red-50 font-semibold'
                    : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
                }`}>
                <span className="text-xs">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4">
          <button onClick={handleLogout}
            className="w-full text-left text-xs text-gray-400 hover:text-[#D93A35] transition-colors font-medium">
            Sign out →
          </button>
        </div>
      </aside>
    </>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden w-9 h-9 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 shadow-sm"
        aria-label="Open menu"
      >
        <span className="w-4 h-0.5 bg-gray-600 rounded" />
        <span className="w-4 h-0.5 bg-gray-600 rounded" />
        <span className="w-4 h-0.5 bg-gray-600 rounded" />
      </button>

      <PortalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
