'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard',     label: 'Dashboard',    icon: '▪' },
    { href: '/pedidos',       label: 'Pedidos',      icon: '▪' },
    { href: '/pedidos/nuevo', label: 'Nuevo Pedido', icon: '+' },
    { href: '/clientes',      label: 'Clientes',     icon: '▪' },
  ];

  return (
    <aside className="w-[220px] min-w-[220px] bg-[#141414] border-r border-[#282828] flex flex-col">
      <div className="px-5 py-6 border-b border-[#282828]">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-medium">
          Panel Interno
        </div>
        <div className="text-[18px] font-semibold tracking-tight mt-0.5 text-zinc-200">
          Fábrica<span className="text-amber-400">.</span>
        </div>
      </div>

      <nav className="flex-1 py-3">
        <div className="px-5 py-3 pb-1 text-[10px] tracking-[0.15em] uppercase text-zinc-600 font-semibold">
          Principal
        </div>
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-5 py-2 text-[13.5px] border-l-2 transition-all ${
                active
                  ? 'text-amber-400 border-amber-400 bg-amber-400/5 font-medium'
                  : 'text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-[#1c1c1c]'
              }`}
            >
              <span className="text-xs">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#282828] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
            AG
          </div>
          <div>
            <div className="text-[13px] font-medium text-zinc-200">Admin</div>
            <div className="text-[11px] text-zinc-500">Administrador</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d] text-zinc-200">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
