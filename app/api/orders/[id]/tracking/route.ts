import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  // Obtener el pedido
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, packlink_shipment_id, status')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (!order.packlink_shipment_id) {
    return NextResponse.json({ error: 'Sin shipment ID de Packlink' }, { status: 400 });
  }

  // Consultar Packlink
  const res = await fetch(
    `${process.env.PACKLINK_API_URL}/shipments/${order.packlink_shipment_id}`,
    {
      headers: {
        'Authorization': process.env.PACKLINK_API_KEY!,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[tracking] Packlink error:', text);
    return NextResponse.json({ error: 'Error consultando Packlink' }, { status: 500 });
  }

  const shipment = await res.json();
  console.log('[tracking] shipment:', JSON.stringify(shipment, null, 2));

  const tracking_url = shipment.tracking_url ?? shipment.carrier_tracking_url ?? null;

  if (tracking_url) {
    await supabaseAdmin
      .from('orders')
      .update({ tracking_url })
      .eq('id', id);
  }

  return NextResponse.json({ tracking_url, shipment_status: shipment.state });
}
