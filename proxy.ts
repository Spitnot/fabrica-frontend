import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that belong to the admin dashboard
const DASHBOARD_PATHS = ['/dashboard', '/pedidos', '/clientes', '/tarifas', '/catalogo'];

/**
 * Reads the Supabase auth cookie and decodes the JWT payload to get the user role.
 * @supabase/auth-helpers-nextjs stores the session in cookies named sb-[ref]-auth-token.
 * We decode the JWT payload (base64) without verifying the signature — verification
 * is done by Supabase on every data request anyway.
 */
function getRoleFromRequest(req: NextRequest): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const ref = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
  const cookieKey = `sb-${ref}-auth-token`;

  // The cookie may be split into chunks (.0, .1, …) if the session JSON is large
  const raw =
    req.cookies.get(cookieKey)?.value ??
    req.cookies.get(`${cookieKey}.0`)?.value;

  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    const token: string = session?.access_token;
    if (!token) return null;

    // Decode the JWT payload (second segment, base64url-encoded)
    const payloadPart = token.split('.')[1];
    const payload = JSON.parse(atob(payloadPart));
    return (payload?.user_metadata?.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isDashboard = DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  const isPortal = pathname.startsWith('/portal');
  const isLogin  = pathname === '/login';

  if (isDashboard || isPortal) {
    const role = getRoleFromRequest(req);

    if (!role) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (isDashboard && role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', req.url));
    }
    if (isPortal && role !== 'customer') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Redirect already-authenticated users away from the login page
  if (isLogin) {
    const role = getRoleFromRequest(req);
    if (role === 'admin')    return NextResponse.redirect(new URL('/dashboard', req.url));
    if (role === 'customer') return NextResponse.redirect(new URL('/portal', req.url));
  }

  return NextResponse.next();
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
