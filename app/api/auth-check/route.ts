import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  // Leer token de la cookie
  const token = req.cookies.getAll().find((c) => c.name.includes('auth-token'))?.value;
  
  if (!token) return NextResponse.json({ error: 'No token', cookies: req.cookies.getAll().map(c => c.name) });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  
  return NextResponse.json({ user_id: user?.id, email: user?.email });
}