import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET — lista de clientes activos
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, contacto_nombre, company_name, direccion_envio')
    .eq('estado', 'active')
    .order('company_name');

  if (error) {
    console.error('[customers GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST — crear nuevo cliente
export async function POST(req: NextRequest) {
  const {
    contacto_nombre, company_name, email, password,
    telefono, nif_cif, street, city, postal_code, country,
  } = await req.json();

  if (!contacto_nombre || !company_name || !email || !password || !nif_cif) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  // 1. Crear usuario en Supabase Auth con rol customer
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'customer' },
  });

  if (authError || !authData.user) {
    console.error('[customers POST] auth error:', authError?.message);
    return NextResponse.json({ error: authError?.message ?? 'Error al crear usuario' }, { status: 500 });
  }

  // 2. Crear registro en customers
  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .insert({
      auth_user_id:    authData.user.id,
      contacto_nombre,
      company_name,
      email,
      telefono:        telefono || null,
      nif_cif,
      direccion_envio: { street, city, postal_code, country },
      estado:          'active',
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    console.error('[customers POST] customer error:', customerError?.message);
    // Borrar el usuario de Auth si falla el customer
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: customerError?.message ?? 'Error al crear cliente' }, { status: 500 });
  }

  return NextResponse.json({ id: customer.id }, { status: 201 });
}
