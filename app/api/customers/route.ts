import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[API] Received body:', body);

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: 'customer',
        full_name: body.contacto_nombre,
      },
    });

    if (authError) {
      console.error('[API] Auth Error:', authError);
      // Return the REAL error to the frontend
      return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
    }

    const userId = authData.user?.id;
    console.log('[API] User created:', userId);

    // 2. Insert into customers table
    const { data, error: dbError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: userId,
        contacto_nombre: body.contacto_nombre,
        company_name: body.company_name,
        email: body.email,
        telefono: body.telefono,
        nif_cif: body.nif_cif,
        tipo_fiscal: body.tipo_fiscal,
        street: body.street,
        city: body.city,
        postal_code: body.postal_code,
        country: body.country,
        fiscal_street: body.fiscal_street,
        fiscal_city: body.fiscal_city,
        fiscal_postal_code: body.fiscal_postal_code,
        fiscal_country: body.fiscal_country,
        tarifa_id: body.tarifa_id,
        descuento_pct: body.descuento_pct,
        tipo_cliente: body.tipo_cliente,
        condiciones_legales: body.condiciones_legales,
        condiciones_comerciales: body.condiciones_comerciales,
        estado: 'active',
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[API] DB Insert Error:', dbError);
      // Return the REAL error to the frontend
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('[API] Server Error:', err);
    return NextResponse.json({ error: `Server Error: ${err.message}` }, { status: 500 });
  }
}