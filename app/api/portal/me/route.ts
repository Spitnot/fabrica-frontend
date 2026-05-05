import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

// GET /api/portal/me
// Devuelve el customer del usuario autenticado con tarifa y precios,
// para uso en el formulario de nuevo pedido (bypasea RLS con supabaseAdmin).
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select(`
      id, auth_user_id,
      first_name, last_name, contacto_nombre,
      company_name, email, descuento_pct,
      ship_street1, ship_city, ship_postal_code, ship_country,
      direccion_envio,
      tarifa:tarifa_id(
        nombre, multiplicador, pack_size, minimum_order_value, hidden_products,
        precios:tarifas_precios(sku, precio, pack_size)
      )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}
