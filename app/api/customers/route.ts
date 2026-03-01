import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

// GET — lista de clientes activos (incluye tarifa básica para orden y badge)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, contacto_nombre, company_name, direccion_envio, tarifa_id, descuento_pct, tarifa:tarifa_id(id, nombre, multiplicador, descripcion)')
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
    contacto_nombre, company_name, email,
    telefono, nif_cif, street, city, postal_code, country,
    tarifa_id, descuento_pct,
  } = await req.json();

  if (!contacto_nombre || !company_name || !email || !nif_cif) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. Create auth user (no password — invite flow)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: 'customer' },
  });

  if (authError || !authData.user) {
    console.error('[customers POST] auth error:', authError?.message);
    return NextResponse.json({ error: authError?.message ?? 'Error creating user' }, { status: 500 });
  }

  // 2. Create customers record
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
      tarifa_id:       tarifa_id || null,
      descuento_pct:   descuento_pct ?? 0,
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    console.error('[customers POST] customer error:', customerError?.message);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: customerError?.message ?? 'Error creating customer' }, { status: 500 });
  }

  // 3. Generate password-setup link (recovery type = one-time link to set password)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.firmarollers.com';
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/portal/perfil` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[customers POST] link error:', linkError?.message);
    // Non-fatal: customer was created, just log and skip email
    return NextResponse.json({ id: customer.id }, { status: 201 });
  }

  // Replace any localhost URL in the action_link's redirect_to parameter
  // (Supabase uses the configured Site URL which may be localhost in dev)
  let setupLink = linkData.properties.action_link;
  try {
    const u = new URL(setupLink);
    const redirectTo = u.searchParams.get('redirect_to');
    if (redirectTo?.includes('localhost')) {
      u.searchParams.set('redirect_to', `${siteUrl}/portal/perfil`);
      setupLink = u.toString();
    }
  } catch { /* keep original link if URL parsing fails */ }

  // 4. Send welcome email with the setup link (best-effort)
  void sendWelcomeEmail({
    to: email,
    nombre: contacto_nombre,
    company: company_name,
    setupLink,
    customerId: customer.id,
  }).catch((e) => console.error('[customers POST] welcome email:', e));

  return NextResponse.json({ id: customer.id }, { status: 201 });
}
