import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Resolve customer id from auth user
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, total_productos, coste_envio_estimado, coste_envio_final, peso_total, order_items(count)')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
