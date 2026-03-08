import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getAuthenticatedCustomerId() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { supabase, userId: null };
  return { supabase, userId: session.user.id };
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedCustomerId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('customers')
    .select('contacto_nombre, company_name, email, telefono, nif_cif, tipo_cliente, direccion_envio')
    .eq('auth_user_id', userId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const { supabase, userId } = await getAuthenticatedCustomerId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Only allow updating contact info and shipping address
  const updates: Record<string, unknown> = {};
  if ('contacto_nombre' in body) updates.contacto_nombre = body.contacto_nombre;
  if ('telefono'        in body) updates.telefono        = body.telefono;
  if ('direccion_envio' in body) updates.direccion_envio = body.direccion_envio;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('auth_user_id', userId);

  if (error) {
    console.error('[portal/profile PUT]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
