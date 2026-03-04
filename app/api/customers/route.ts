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

  // 3. Generate invite link — try 'invite', fall back to 'recovery', then to site root.
  //    IMPORTANT: redirectTo must be listed in Supabase → Auth → URL Configuration.
  //    If generateLink fails we still send the welcome email with a fallback link so
  //    the customer at least knows their account exists, and admin can resend later.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';
  const callbackUrl = `${siteUrl}/auth/callback?next=/auth/set-password`;

  let setupLink = `${siteUrl}/login`; // absolute fallback

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: callbackUrl },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[customers POST] generateLink (invite) failed:', linkError?.message);

    // Try recovery type as fallback
    const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: callbackUrl },
    });

    if (!recoveryError && recoveryData?.properties?.action_link) {
      setupLink = recoveryData.properties.action_link;
      console.log('[customers POST] using recovery link as fallback');
    } else {
      console.error('[customers POST] generateLink (recovery) also failed:', recoveryError?.message);
      // setupLink stays as site login page — admin can resend via Resend Invite button
    }
  } else {
    setupLink = linkData.properties.action_link;
  }

  // Fix redirect_to if Supabase rewrote it to their own domain
  try {
    const u = new URL(setupLink);
    const redirectTo = u.searchParams.get('redirect_to');
    if (redirectTo && !redirectTo.startsWith(siteUrl)) {
      u.searchParams.set('redirect_to', callbackUrl);
      setupLink = u.toString();
    }
  } catch { /* keep link as-is */ }

  // 4. Send welcome email — always, regardless of link quality
  void sendWelcomeEmail({
    to:         email,
    nombre:     contacto_nombre,
    company:    company_name,
    setupLink,
    customerId: customer.id,
  }).catch((e) => console.error('[customers POST] welcome email:', e));

  return NextResponse.json({ id: customer.id }, { status: 201 });
}
