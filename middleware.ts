import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that belong to the admin dashboard
const DASHBOARD_PATHS = ['/dashboard', '/pedidos', '/clientes', '/tarifas', '/catalogo'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const role = session?.user?.user_metadata?.role as string | undefined;

  const isDashboard = DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  const isPortal = pathname.startsWith('/portal');
  const isLogin  = pathname === '/login';

  // Protected routes: require auth + correct role
  if (isDashboard || isPortal) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (isDashboard && role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', req.url));
    }
    if (isPortal && role !== 'customer') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Login page: redirect already-authenticated users to their environment
  if (isLogin && session) {
    const dest = role === 'admin' ? '/dashboard' : '/portal';
    return NextResponse.redirect(new URL(dest, req.url));
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
