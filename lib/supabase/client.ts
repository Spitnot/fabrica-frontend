// lib/supabase/client.ts
// ─── Solo para componentes cliente ('use client') ─────────────────────────────
// Usa anon key → RLS activo → cada customer solo ve sus datos
// Usa createBrowserClient (de @supabase/auth-helpers-nextjs / @supabase/ssr)
// para que la sesión se guarde en cookies y el middleware pueda leerla.

import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('[supabase/client] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createBrowserClient(url, key);
  return _client;
}

export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) { return Reflect.get(getClient(), prop, receiver); },
  set(_t, prop, value)    { return Reflect.set(getClient(), prop, value); },
});
