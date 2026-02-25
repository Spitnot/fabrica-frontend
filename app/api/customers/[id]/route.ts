import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_productos, peso_total, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ customer, orders: orders ?? [] });
}
