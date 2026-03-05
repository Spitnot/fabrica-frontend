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

    // 2. Prepare the insert object using JSONB for addresses
    const insertData: Record<string, any> = {
      id: userId,
      contacto_nombre: body.contacto_nombre,
      company_name: body.company_name,
      email: body.email,
      telefono: body.telefono,
      nif_cif: body.nif_cif,
      tipo_fiscal: body.tipo_fiscal,
      
      // Commercial & Legal
      tarifa_id: body.tarifa_id,
      descuento_pct: body.descuento_pct,
      tipo_cliente: body.tipo_cliente,
      condiciones_legales: body.condiciones_legales,
      condiciones_comerciales: body.condiciones_comerciales,
      estado: 'active',
      
      // SHIPPING ADDRESS -> Map to 'direccion_envio' (JSONB)
      direccion_envio: {
        street: body.street,
        city: body.city,
        state: '', // Add if available
        postal_code: body.postal_code,
        country: body.country,
      },

      // FISCAL ADDRESS -> Map to 'direccion_fiscal' (JSONB) (Assuming this is the name)
      // If the DB column doesn't exist at all, we remove it. 
      // But usually if one is JSONB, the other is too.
      direccion_fiscal: {
        street: body.fiscal_street,
        city: body.fiscal_city,
        state: body.fiscal_state,
        postal_code: body.fiscal_postal_code,
        country: body.fiscal_country,
      }
    };

    // 3. Insert into customers table
    const { data, error: dbError } = await supabaseAdmin
      .from('customers')
      .insert(insertData)
      .select('id')
      .single();

    if (dbError) {
      console.error('[API] DB Insert Error:', dbError);
      // If 'direccion_fiscal' column doesn't exist, this will error.
      // If so, we will just remove it in the next iteration.
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('[API] Server Error:', err);
    return NextResponse.json({ error: `Server Error: ${err.message}` }, { status: 500 });
  }
}