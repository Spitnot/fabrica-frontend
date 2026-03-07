import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCustomerInviteEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password ?? crypto.randomUUID(),
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
      company_name: body.company_name,
      email: body.email,
      telefono: body.telefono,
      nif_cif: body.nif_cif,
      tipo_fiscal: body.tipo_fiscal,
      tarifa_id: body.tarifa_id,
      descuento_pct: body.descuento_pct,
      tipo_cliente: body.tipo_cliente,
      condiciones_legales: body.condiciones_legales,
      condiciones_comerciales: body.condiciones_comerciales,
      estado: 'active',
      direccion_envio: {
        street: body.street,
        city: body.city,
        state: '',
        postal_code: body.postal_code,
        country: body.country,
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
      // Limpiar usuario de Auth si falla la DB
      await supabaseAdmin.auth.admin.deleteUser(userId!);
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    // 3. Generar invite link y enviar email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
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
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('[API] Server Error:', err);
    return NextResponse.json({ error: `Server Error: ${err.message}` }, { status: 500 });
  }
}