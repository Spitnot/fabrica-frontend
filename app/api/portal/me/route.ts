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

  const SELECT = `
    id, auth_user_id,
    first_name, last_name, contacto_nombre,
    company_name, email, descuento_pct,
    ship_street1, ship_city, ship_postal_code, ship_country,
    direccion_envio,
    tarifa:tarifa_id(
      nombre, multiplicador, pack_size, minimum_order_value, hidden_products,
      precios:tarifas_precios(sku, precio)
    )
  `

  // Try auth_user_id first (new customers), fall back to id (legacy customers)
  let customer: any = null
  const { data: byAuthId, error: e1 } = await supabaseAdmin
    .from('customers').select(SELECT).eq('auth_user_id', user.id).maybeSingle()

  if (e1) console.error('[portal/me] query by auth_user_id:', e1.message, e1.details)

  if (byAuthId) {
    customer = byAuthId
  } else {
    const { data: byId, error: e2 } = await supabaseAdmin
      .from('customers').select(SELECT).eq('id', user.id).maybeSingle()
    if (e2) console.error('[portal/me] query by id:', e2.message, e2.details)
    customer = byId
  }

  if (!customer) {
    console.error('[portal/me] no customer found for user', user.id)
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}
