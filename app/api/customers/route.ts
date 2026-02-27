import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, contacto_nombre, company_name, direccion_envio, tarifa_id, descuento_pct, telefono, tarifa:tarifa_id(id, nombre, multiplicador, descripcion)')
    .eq('estado', 'active')
    .order('company_name');

  if (error) {
    console.error('[customers GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    // Contact & auth
    contacto_nombre, company_name, email, password,
    // Legal identity
    nombre_comercial, tipo_empresa, nif_cif, tipo_fiscal, numero_eori, fecha_constitucion,
    // Contact
    telefono,
    // Addresses
    street, city, postal_code, country,
    fiscal_street, fiscal_city, fiscal_state, fiscal_postal_code, fiscal_country,
    // Commercial profile
    tipo_cliente, zona_distribucion, marcas_comercializadas, volumen_estimado, num_puntos_venta,
    // Legal
    condiciones_legales,
    // Internal
    tarifa_id, descuento_pct, condiciones_comerciales,
  } = body;

  if (!contacto_nombre || !company_name || !email || !password || !nif_cif || !telefono) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

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

  const direccion_fiscal = fiscal_street
    ? { street: fiscal_street, city: fiscal_city, state: fiscal_state ?? null, postal_code: fiscal_postal_code, country: fiscal_country ?? 'ES' }
    : null;

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .insert({
      auth_user_id:    authData.user.id,
      // Legal identity
      contacto_nombre,
      company_name,
      nombre_comercial:       nombre_comercial     || null,
      tipo_empresa:           tipo_empresa         || null,
      nif_cif,
      tipo_fiscal:            tipo_fiscal          || 'NIF/CIF',
      numero_eori:            numero_eori          || null,
      fecha_constitucion:     fecha_constitucion   || null,
      // Contact
      email,
      telefono:               telefono             || null,
      // Addresses
      direccion_fiscal,
      direccion_envio: { street, city, postal_code, country: country ?? 'ES' },
      // Commercial profile
      tipo_cliente:           tipo_cliente         || null,
      zona_distribucion:      zona_distribucion    || null,
      marcas_comercializadas: marcas_comercializadas || null,
      volumen_estimado:       volumen_estimado     || null,
      num_puntos_venta:       num_puntos_venta     || null,
      // Legal
      condiciones_legales:    condiciones_legales  ?? {},
      // Internal
      estado:                 'active',
      tarifa_id:              tarifa_id            || null,
      descuento_pct:          descuento_pct        ?? 0,
      condiciones_comerciales: condiciones_comerciales ?? {},
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    console.error('[customers POST] customer error:', customerError?.message);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: customerError?.message ?? 'Error al crear cliente' }, { status: 500 });
  }

  return NextResponse.json({ id: customer.id }, { status: 201 });
}
