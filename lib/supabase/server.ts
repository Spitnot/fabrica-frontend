// lib/supabase/server.ts
// ─── Solo para API Routes y Server Components ─────────────────────────────────
// Usa service_role_key → salta RLS → el admin ve todo
// ⚠️ NUNCA importar esto en componentes con 'use client'

import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
