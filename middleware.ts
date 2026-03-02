import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All route prefixes that belong to the admin dashboard
const ADMIN_PREFIXES = ['/dashboard', '/pedidos', '/clientes', '/tarifas', '/catalogo', '/emails', '/usuarios'];

// Roles that can access the admin dashboard (not customers)
const ADMIN_ROLES = ['admin', 'manager', 'viewer'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  const isAdminRoute  = ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isPortalRoute = pathname === '/portal' || pathname.startsWith('/portal/');
  const isProtected   = isAdminRoute || isPortalRoute;

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!session) {
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
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
