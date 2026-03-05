import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Create user in Supabase Auth
    // We use admin.createUser to auto-confirm the email so they can log in immediately
    // or use the password provided.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'customer',
        full_name: body.contacto_nombre,
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
      }
      throw authError;
    }

    const userId = authData.user?.id;

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
      // If DB insert fails, we should ideally clean up the auth user, but for now we just error
      console.error('DB Insert Error:', dbError);
      return NextResponse.json({ error: 'Failed to create customer profile.' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, message: 'Customer created' }, { status: 201 });

  } catch (err: any) {
    console.error('Server Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}