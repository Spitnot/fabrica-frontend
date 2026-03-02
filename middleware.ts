import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All route prefixes that belong to the admin dashboard
const ADMIN_PREFIXES = ['/dashboard', '/pedidos', '/clientes', '/tarifas', '/catalogo', '/emails', '/usuarios'];

// Roles that can access the admin dashboard (not customers)
const ADMIN_ROLES = ['admin', 'manager', 'viewer'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // createMiddlewareClient reads the session from cookies and refreshes it
  // when it has expired — the updated Set-Cookie is forwarded via `res`.
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  const isAdminRoute  = ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isPortalRoute = pathname === '/portal' || pathname.startsWith('/portal/');
  const isProtected   = isAdminRoute || isPortalRoute;

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!session) {
    // Send unauthenticated users to /login for both protected routes and root
    if (isProtected || pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  const role = session.user.user_metadata?.role as string | undefined;

  // Already logged in — skip the login page and root, go to their home
  if (pathname === '/login' || pathname === '/') {
    const dest = role === 'customer' ? '/portal' : '/dashboard';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Customer (or unknown role) trying to access the admin dashboard
  if (isAdminRoute && !ADMIN_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL('/portal', req.url));
  }

  // Admin team member trying to access the customer portal
  if (isPortalRoute && role !== 'customer') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all routes EXCEPT:
     *  - Next.js internals  (_next/static, _next/image)
     *  - favicon.ico
     *  - public static assets (.svg, .png, .jpg, …)
     *  - API routes (/api/…) — auth is handled at the handler level
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
