// lib/supabase/client.ts
// ─── Solo para componentes cliente ('use client') ─────────────────────────────
// Usa anon key → RLS activo → cada customer solo ve sus datos
// createClientComponentClient almacena la sesión en cookies (necesario para proxy.ts)

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabaseClient = createClientComponentClient();
