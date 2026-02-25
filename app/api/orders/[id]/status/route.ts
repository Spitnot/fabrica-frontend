import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { OrderStatus } from '@/types';

const VALID_STATUSES: OrderStatus[] = [
  'draft', 'confirmado', 'produccion', 'listo_envio', 'enviado', 'cancelado'
];

// Transiciones permitidas
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft:       ['confirmado', 'cancelado'],
  confirmado:  ['produccion', 'cancelado'],
  produccion:  ['listo_envio', 'cancelado'],
  listo_envio: ['enviado', 'cancelado'],
  enviado:     [],
  cancelado:   [],
};

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const formData = await req.formData();
  const newStatus = formData.get('status') as OrderStatus;

  // Validar status
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
  }

  // Leer estado actual
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Validar transición
  const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `No se puede pasar de ${order.status} a ${newStatus}` },
      { status: 400 }
    );
  }

  // Actualizar estado
  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'enviado') updates.sent_at = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Redirigir de vuelta al detalle
  return NextResponse.redirect(new URL(`/pedidos/${id}`, req.url));
}
