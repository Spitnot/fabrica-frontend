import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AuthSuccess = { user: { id: string; role: string }; response: null }
type AuthFailure = { user: null; response: NextResponse }
type AuthResult  = AuthSuccess | AuthFailure

export async function requireRole(allowed: string[]): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const role: string = user.user_metadata?.role ?? ''
  if (!allowed.includes(role))
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user: { id: user.id, role }, response: null }
}

// Shorthand helpers
export const requireAdmin        = () => requireRole(['admin'])
export const requireAdminManager = () => requireRole(['admin', 'manager'])
export const requireStaff        = () => requireRole(['admin', 'manager', 'viewer'])
export const requireAnyAuth      = () => requireRole(['admin', 'manager', 'viewer', 'customer'])
