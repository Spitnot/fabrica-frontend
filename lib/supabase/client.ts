// lib/supabase/client.ts
// ─── Solo para componentes cliente ('use client') ─────────────────────────────
// Usa anon key → RLS activo → cada customer solo ve sus datos

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton: el cliente se crea en el primer acceso a cualquier propiedad,
// no al importar el módulo. Esto evita el error "supabaseUrl is required" durante
// `next build` en Vercel, donde los módulos se importan antes de que las variables
// de entorno estén disponibles.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('[supabase/client] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createClient(url, key);
  return _client;
}

export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) { return Reflect.get(getClient(), prop, receiver); },
  set(_t, prop, value)    { return Reflect.set(getClient(), prop, value); },
});
