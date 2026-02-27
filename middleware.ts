import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Build a response we can mutate (needed so @supabase/ssr can refresh cookies)
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
          // Write updated cookies to the outgoing response
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the token server-side (more secure than getSession)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  const isDashboard =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/pedidos') ||
    pathname.startsWith('/clientes') ||
    pathname.startsWith('/tarifas') ||
    pathname.startsWith('/catalogo');
  const isPortal = pathname.startsWith('/portal');
  const isLogin  = pathname === '/login';

  // Not authenticated → send to login
  if (!user && (isDashboard || isPortal)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user) {
    const role = user.user_metadata?.role as string | undefined;

    if (isDashboard && role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', req.url));
    }

    if (isPortal && role !== 'customer') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Already authenticated → skip login page
    if (isLogin) {
      if (role === 'admin')    return NextResponse.redirect(new URL('/dashboard', req.url));
      if (role === 'customer') return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pedidos/:path*',
    '/clientes/:path*',
    '/tarifas/:path*',
    '/catalogo/:path*',
    '/portal/:path*',
    '/login',
  ],
};
