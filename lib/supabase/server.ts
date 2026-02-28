// lib/supabase/server.ts
// ─── Solo para API Routes y Server Components ─────────────────────────────────
// Usa service_role_key → salta RLS → el admin ve todo
// ⚠️ NUNCA importar esto en componentes con 'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton: el cliente se crea en el primer acceso a cualquier propiedad,
// no al importar el módulo. Esto evita el error "supabaseUrl is required" durante
// `next build` en Vercel, donde los módulos se importan antes de que las variables
// de entorno estén disponibles.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[supabase/server] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  _client = createClient(url, key);
  return _client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) { return Reflect.get(getClient(), prop, receiver); },
  set(_t, prop, value)    { return Reflect.set(getClient(), prop, value); },
});
