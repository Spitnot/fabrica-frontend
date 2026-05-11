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
    first_name, last_name,
    company_name, email, descuento_pct,
    ship_street1, ship_city, ship_postal_code, ship_country,
    tarifa:tarifa_id(
      nombre, multiplicador, pack_size, minimum_order_value, hidden_products,
      precios:tarifas_precios(sku, precio)
    )
  `

  // Try auth_user_id first (new customers), fall back to id (legacy customers)
  let customer: any = null
  let queryError: string | null = null

  const { data: byAuthId, error: e1 } = await supabaseAdmin
    .from('customers').select(SELECT).eq('auth_user_id', user.id).maybeSingle()

  if (e1) {
    console.error('[portal/me] query by auth_user_id:', e1.message, e1.details)
    queryError = e1.message
  }

  if (byAuthId) {
    customer = byAuthId
  } else {
    const { data: byId, error: e2 } = await supabaseAdmin
      .from('customers').select(SELECT).eq('id', user.id).maybeSingle()
    if (e2) {
      console.error('[portal/me] query by id:', e2.message, e2.details)
      queryError = e2.message
    }
    customer = byId
  }

  if (!customer) {
    console.error('[portal/me] no customer found for user', user.id)
    // Return the real Supabase error if the query itself failed (bad column, etc.)
    if (queryError) return NextResponse.json({ error: `DB error: ${queryError}` }, { status: 500 })
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Compute contacto_nombre from flat columns (legacy column may not exist in schema)
  return NextResponse.json({
    data: {
      ...customer,
      contacto_nombre: customer.first_name
        ? `${customer.first_name} ${customer.last_name ?? ''}`.trim()
        : null,
    },
  });
}
