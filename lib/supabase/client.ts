// lib/supabase/client.ts
// ─── Solo para componentes cliente ('use client') ─────────────────────────────
// Usa anon key → RLS activo → cada customer solo ve sus datos

import { createClient } from '@supabase/supabase-js';

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
