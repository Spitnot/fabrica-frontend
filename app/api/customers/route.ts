import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 2. Prepare the insert object matching the ACTUAL DB schema
    const insertData: Record<string, any> = {
      id: userId,
      contacto_nombre: body.contacto_nombre,
      company_name: body.company_name,
      email: body.email,
      telefono: body.telefono,
      nif_cif: body.nif_cif,
      tipo_fiscal: body.tipo_fiscal,
      // Fiscal Address (Columns exist)
      fiscal_street: body.fiscal_street,
      fiscal_city: body.fiscal_city,
      fiscal_state: body.fiscal_state,
      fiscal_postal_code: body.fiscal_postal_code,
      fiscal_country: body.fiscal_country,
      // Commercial
      tarifa_id: body.tarifa_id,
      descuento_pct: body.descuento_pct,
      tipo_cliente: body.tipo_cliente,
      condiciones_legales: body.condiciones_legales,
      condiciones_comerciales: body.condiciones_comerciales,
      estado: 'active',
    };

    // 3. Handle Shipping Address (JSONB column 'direccion_envio')
    // If street/city are present in body, we put them in the JSONB object
    if (body.street || body.city) {
      insertData.direccion_envio = {
        street: body.street,
        city: body.city,
        postal_code: body.postal_code,
        country: body.country,
      };
    }

    // 4. Insert into customers table
    const { data, error: dbError } = await supabaseAdmin
      .from('customers')
      .insert(insertData)
      .select('id')
      .single();

    if (dbError) {
      console.error('[API] DB Insert Error:', dbError);
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('[API] Server Error:', err);
    return NextResponse.json({ error: `Server Error: ${err.message}` }, { status: 500 });
  }
}