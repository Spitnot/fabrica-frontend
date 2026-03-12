import { sendCustomerInviteEmail } from '@/lib/emailService';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, contacto_nombre, company_name, tarifa_id, descuento_pct, direccion_envio')
    .eq('estado', 'active')
    .order('company_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        role: 'customer',
        full_name: body.contacto_nombre,
      },
    });

    if (authError) {
      console.error('[API] Auth Error:', authError);
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 2. Insert into customers table
    const insertData: Record<string, any> = {
      id: userId,
      auth_user_id: userId,
      contacto_nombre: body.contacto_nombre,
      company_name: body.company_name || body.contacto_nombre,
      email: body.email,
      telefono: body.telefono,
      nif_cif: body.nif_cif || '',
      tipo_fiscal: body.tipo_fiscal,
      nombre_comercial: body.nombre_comercial ?? null,
      tipo_empresa: body.tipo_empresa ?? null,
      numero_eori: body.numero_eori ?? null,
      fecha_constitucion: body.fecha_constitucion ?? null,
      tarifa_id: body.tarifa_id,
      descuento_pct: body.descuento_pct,
     tipo_cliente:           body.tipo_cliente            ?? null,
      zona_distribucion:      body.zona_distribucion       ?? null,
      marcas_comercializadas: body.marcas_comercializadas  ?? null,
      volumen_estimado:       body.volumen_estimado        ?? null,
      num_puntos_venta:       body.num_puntos_venta        ?? null,
      condiciones_legales: body.condiciones_legales,
      condiciones_comerciales: body.condiciones_comerciales,
      estado: 'active',
     direccion_envio: {
        street:      body.street      ?? '',
        city:        body.city        ?? '',
        state:       '',
        postal_code: body.postal_code ?? '',
        country:     body.country     ?? '',
      },
      direccion_fiscal: {
        street: body.fiscal_street,
        city: body.fiscal_city,
        state: body.fiscal_state,
        postal_code: body.fiscal_postal_code,
        country: body.fiscal_country,
      },
    };

    const { data, error: dbError } = await supabaseAdmin
      .from('customers')
      .insert(insertData)
      .select('id')
      .single();

    if (dbError) {
      console.error('[API] DB Insert Error:', dbError);
      await supabaseAdmin.auth.admin.deleteUser(userId!);
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    // 3. Generar invite link y enviar email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: body.email,
      options: {
        redirectTo: 'https://b2b.firmarollers.com/auth/callback?next=/reset-password',
      },
    });

    if (!linkError && linkData.properties?.action_link) {
      await sendCustomerInviteEmail(
        body.email,
        body.contacto_nombre,
        linkData.properties.action_link,
        userId,
      );
    } else {
      console.error('[API] Failed to generate invite link:', linkError);
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('[API] Server Error:', err);
    return NextResponse.json({ error: `Server Error: ${err.message}` }, { status: 500 });
  }
}