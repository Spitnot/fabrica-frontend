import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Client con sesión de usuario — para Server Components y Route Handlers ───
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components no pueden setear cookies — es esperado
          }
        },
      },
    }
  )
}

// ─── Admin client — salta RLS, solo para server ───────────────────────────────
// ⚠️ NUNCA importar en componentes 'use client'
let _adminClient: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('[supabase/server] Faltan variables de entorno')
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  return _adminClient
}

// Mantener compatibilidad con imports existentes
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) { return Reflect.get(getAdminClient(), prop, receiver) },
  set(_t, prop, value)    { return Reflect.set(getAdminClient(), prop, value) },
})