// lib/supabase/client.ts
// ─── Solo para componentes cliente ('use client') ─────────────────────────────
// Usa anon key → RLS activo → cada customer solo ve sus datos
// createBrowserClient almacena la sesión en cookies (necesario para proxy.ts)

import { createBrowserClient } from '@supabase/ssr';

export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
