import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, contacto_nombre, company_name, direccion_envio')
    .eq('estado', 'active')
    .order('company_name');

  if (error) {
    console.error('[customers]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
