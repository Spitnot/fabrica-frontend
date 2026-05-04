'use client';

/**
 * Drop-in replacement for app/(portal)/layout.tsx
 *
 * Storefront-faithful chrome:
 *   ┌──────────────────────────────────────────────┐
 *   │  ‹  FREE SHIPPING WITHIN EUROPE…   ›        │ ← banner
 *   ├──────────────────────────────────────────────┤
 *   │  50€ = FREE SHIPPING                         │ ← micro-line
 *   │  ORDERS  NEW ORDER  PROFILE   …  ⌐⌐  ⊟ ⊠ ⌫  │ ← nav (mustache + icons)
 *   ├──────────────────────────────────────────────┤
 *   │  WHOLESALE · BOMBING SUPPLIES · −15% APPLIED │ ← thin B2B context strip
 *   └──────────────────────────────────────────────┘
 *
 * Footer: full FIRMA ROLLERS wordmark, WHOLESALE block, support card.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Mustache, FirmaWordmark } from './brand';

const NAV = [
  { href: '/portal',                label: 'Orders' },
  { href: '/portal/pedidos/nuevo',  label: 'New Order' },
  { href: '/portal/perfil',         label: 'Profile' },
];

function isActive(pathname: string, href: string) {
  if (href === '/portal') {
    return pathname === '/portal'
      || (pathname.startsWith('/portal/pedidos/') && !pathname.startsWith('/portal/pedidos/nuevo'));
  }
  return pathname === href || pathname.startsWith(href + '/');
}

interface PortalUser { name: string; company: string; tier?: string | null; }

export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/portal/profile').then(r => r.json()).then(({ data }) => {
      if (!data) return;
      const name = data.first_name
        ? `${data.first_name} ${data.last_name ?? ''}`.trim()
        : (data.contacto_nombre ?? '—');
      setUser({ name, company: data.company_name ?? '—', tier: data.tarifa?.nombre });
    });
  }, []);

  async function logout() {
    await supabaseClient.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="fr-shell">
      {/* ── 1. Top banner (black, the famous shipping line) ───────── */}
      <div className="fr-banner">
        <button className="fr-banner__arrow" aria-label="Previous">‹</button>
        <span>FREE SHIPPING WITHIN EUROPE ON ORDERS OVER 50€!</span>
        <button className="fr-banner__arrow" aria-label="Next">›</button>
      </div>

      {/* ── 2. Micro-line ────────────────────────────────────────── */}
      <div className="fr-microline">50€ = FREE SHIPPING</div>

      {/* ── 3. Main nav ──────────────────────────────────────────── */}
      <nav className="fr-nav">
        <ul className="fr-nav__list">
          {NAV.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`fr-nav__link ${isActive(pathname, href) ? 'is-active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="fr-nav__brand">
          <Mustache height={22} />
          <sup className="fr-nav__reg">®</sup>
        </div>

        <div className="fr-nav__icons">
          <a href="https://instagram.com/firmarollers" target="_blank" rel="noreferrer"
             className="fr-icon-btn" aria-label="Instagram">
            <IgIcon />
          </a>
          <Link href="/portal/perfil" className="fr-icon-btn" aria-label="Profile">
            <UserIcon />
          </Link>
          <Link href="/portal/pedidos/nuevo" className="fr-icon-btn" aria-label="New Order">
            <BagIcon />
          </Link>
          <button
            className="fr-icon-btn fr-nav__burger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            <BurgerIcon />
          </button>
        </div>
      </nav>

      {/* ── 4. B2B context strip — the only "I'm in the portal" cue ── */}
      {user && (
        <div className="fr-context">
          <span className="fr-context__tag">WHOLESALE</span>
          <span className="fr-context__sep">·</span>
          <span className="fr-context__name">{user.company.toUpperCase()}</span>
          {user.tier && (
            <>
              <span className="fr-context__sep">·</span>
              <span className="fr-context__tier">{user.tier.toUpperCase()}</span>
            </>
          )}
          <button className="fr-context__logout" onClick={logout}>SIGN OUT</button>
        </div>
      )}

      {/* ── 5. Mobile menu (slides under nav) ─────────────────────── */}
      {mobileOpen && (
        <div className="fr-mobile-menu">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`fr-mobile-menu__link ${isActive(pathname, href) ? 'is-active' : ''}`}
            >
              {label.toUpperCase()}
            </Link>
          ))}
          <button className="fr-mobile-menu__link" onClick={logout}>SIGN OUT</button>
        </div>
      )}

      {/* ── 6. Page body ─────────────────────────────────────────── */}
      <main className="fr-main">{children}</main>

      {/* ── 7. Footer (storefront-style) ─────────────────────────── */}
      <footer className="fr-footer">
        <div className="fr-footer__grid">
          <div>
            <FirmaWordmark width={180} />
            <h4 className="fr-footer__heading">WHOLESALE</h4>
            <ul className="fr-footer__list">
              <li>Shipping processed in 24-48h</li>
              <li>Tracking on all orders</li>
              <li>100% secure payment</li>
            </ul>
            <p className="fr-footer__tagline">SUPPORT YOUR INDEPENDENT MARKER BRAND</p>
          </div>

          <div className="fr-footer__support">
            <h4 className="fr-footer__heading">NEED A HAND?</h4>
            <p className="fr-footer__copy">
              Questions about your account, an order, or wholesale pricing? Drop us a line —
              we usually reply within one business day.
            </p>
            <a href="mailto:wholesale@firmarollers.com" className="fr-footer__cta">
              wholesale@firmarollers.com
            </a>
            <a href="tel:+34900000000" className="fr-footer__phone">
              +34 900 000 000
            </a>
          </div>
        </div>

        <div className="fr-footer__legal">
          <span>© 2026 FIRMA ROLLERS</span>
          <span>Terms and Policies</span>
        </div>
      </footer>

      <style jsx global>{`
        :root {
          --fr-ink: #111;
          --fr-paper: #fff;
          --fr-muted: #888;
          --fr-line: #111;
          --fr-line-soft: #e7e5e0;
          --fr-red: #D93A35;
          --fr-purple: #6B5BD5;
          --fr-yellow: #F4D03F;
          --fr-green: #5BB85A;
          --fr-orange: #E07B3A;
          --fr-blue: #5BA8C7;
          --fr-mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
          --fr-display: 'Alexandria', system-ui, sans-serif;
        }

        body { background: #fff; color: var(--fr-ink); }

        .fr-shell { min-height: 100vh; display: flex; flex-direction: column; }

        /* Banner */
        .fr-banner {
          background: #111; color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 14px;
          font-family: var(--fr-display);
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
        }
        .fr-banner span { flex: 1; text-align: center; }
        .fr-banner__arrow {
          background: transparent; border: 0; color: #fff;
          font-size: 18px; cursor: pointer; padding: 0 6px; line-height: 1;
        }

        .fr-microline {
          text-align: center; padding: 6px 0;
          font-family: var(--fr-mono); font-size: 11px; color: #111;
          border-bottom: 1px solid var(--fr-line-soft);
        }

        /* Nav */
        .fr-nav {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 14px 24px;
          border-bottom: 1px solid var(--fr-ink);
          gap: 16px;
        }
        .fr-nav__list {
          display: flex; gap: 28px; list-style: none; padding: 0; margin: 0;
        }
        .fr-nav__link {
          font-family: var(--fr-display);
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
          color: #111; text-transform: uppercase; text-decoration: none;
          padding: 4px 0; border-bottom: 2px solid transparent;
        }
        .fr-nav__link.is-active { border-bottom-color: #111; }
        .fr-nav__link:hover { opacity: 0.7; }

        .fr-nav__brand {
          display: flex; align-items: flex-start; gap: 2px;
          justify-self: center;
        }
        .fr-nav__reg {
          font-family: var(--fr-mono); font-size: 9px;
        }

        .fr-nav__icons {
          display: flex; gap: 14px; justify-self: end; align-items: center;
        }
        .fr-icon-btn {
          background: transparent; border: 0; padding: 4px;
          color: #111; cursor: pointer; display: inline-flex;
        }
        .fr-icon-btn:hover { opacity: 0.6; }
        .fr-nav__burger { display: none; }

        @media (max-width: 768px) {
          .fr-nav { grid-template-columns: auto 1fr auto; padding: 12px 16px; }
          .fr-nav__list { display: none; }
          .fr-nav__brand { justify-self: start; }
          .fr-nav__burger { display: inline-flex; }
        }

        .fr-mobile-menu {
          display: flex; flex-direction: column;
          border-bottom: 1px solid var(--fr-ink);
          background: #fff;
        }
        .fr-mobile-menu__link {
          padding: 14px 24px;
          font-family: var(--fr-display);
          font-size: 14px; font-weight: 700; letter-spacing: 0.08em;
          color: #111; text-decoration: none; text-align: left;
          background: transparent; border: 0;
          border-bottom: 1px solid var(--fr-line-soft);
        }
        .fr-mobile-menu__link.is-active { background: #111; color: #fff; }

        /* Context strip */
        .fr-context {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 24px;
          background: #f7f6f1;
          border-bottom: 1px solid var(--fr-line-soft);
          font-family: var(--fr-mono); font-size: 11px; color: #555;
        }
        .fr-context__tag {
          background: var(--fr-red); color: #fff;
          padding: 2px 7px; font-weight: 700; letter-spacing: 0.08em;
        }
        .fr-context__sep { color: #ccc; }
        .fr-context__name { font-weight: 700; color: #111; letter-spacing: 0.04em; }
        .fr-context__tier { letter-spacing: 0.06em; }
        .fr-context__logout {
          margin-left: auto;
          background: transparent; border: 0; cursor: pointer;
          font-family: var(--fr-mono); font-size: 11px;
          letter-spacing: 0.1em; color: #888;
        }
        .fr-context__logout:hover { color: #111; }
        @media (max-width: 768px) { .fr-context { padding: 7px 16px; flex-wrap: wrap; } }

        /* Main */
        .fr-main { flex: 1; }

        /* Footer */
        .fr-footer {
          margin-top: 64px;
          background: var(--fr-purple);
          color: #111;
          padding: 56px 24px 16px;
        }
        .fr-footer__grid {
          max-width: 1200px; margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
        }
        @media (max-width: 768px) {
          .fr-footer__grid { grid-template-columns: 1fr; gap: 32px; }
          .fr-footer { padding: 40px 16px 16px; }
        }
        .fr-footer__heading {
          font-family: var(--fr-display);
          font-size: 14px; font-weight: 900; letter-spacing: 0.1em;
          margin: 24px 0 12px;
        }
        .fr-footer__list {
          font-family: var(--fr-mono); font-size: 12px; line-height: 1.9;
          padding-left: 18px; margin: 0;
        }
        .fr-footer__tagline {
          margin-top: 24px;
          font-family: var(--fr-display);
          font-size: 13px; font-weight: 900; letter-spacing: 0.06em;
        }
        .fr-footer__copy {
          font-family: var(--fr-mono); font-size: 12px; line-height: 1.6;
          max-width: 400px;
        }
        .fr-footer__cta {
          display: inline-block;
          margin-top: 16px;
          background: #fff;
          color: #111;
          padding: 12px 18px;
          font-family: var(--fr-display);
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
          text-decoration: none;
        }
        .fr-footer__cta:hover { background: #111; color: #fff; }
        .fr-footer__phone {
          display: block; margin-top: 12px;
          font-family: var(--fr-mono); font-size: 12px;
          color: #111; text-decoration: none;
        }
        .fr-footer__legal {
          max-width: 1200px; margin: 48px auto 0;
          display: flex; justify-content: space-between;
          font-family: var(--fr-mono); font-size: 10px;
          color: rgba(0,0,0,0.5);
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

/* ── Tiny inline icons (match the storefront's line weight) ───── */

function IgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 7h14l-1.2 13.2A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-2-1.8L5 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
function BurgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
