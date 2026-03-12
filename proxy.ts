import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PREFIXES = ['/dashboard', '/pedidos', '/clientes', '/tarifas', '/catalogo', '/emails', '/usuarios']
const ADMIN_ROLES = ['admin', 'manager', 'viewer']
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password']

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl

  const isAdminRoute = ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isPortalRoute = pathname === '/portal' || pathname.startsWith('/portal/')
  const isProtected  = isAdminRoute || isPortalRoute
  const isAuthRoute  = AUTH_ROUTES.includes(pathname)

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) {
    if (isProtected || pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // ── Authenticated ────────────────────────────────────────────────────────────
  const role = user.user_metadata?.role as string | undefined

  if (isAuthRoute) return res

  if (pathname === '/') {
    const dest = role === 'customer' ? '/portal' : '/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // Customer trying to access admin
  if (isAdminRoute && !ADMIN_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  // Admin trying to access portal
  if (isPortalRoute && role !== 'customer') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Customer without completed onboarding → redirect to onboarding
  if (isPortalRoute && pathname !== '/portal/onboarding' && role === 'customer') {
    const onboardingDone = user.user_metadata?.onboarding_completed
    if (!onboardingDone) {
      return NextResponse.redirect(new URL('/portal/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}