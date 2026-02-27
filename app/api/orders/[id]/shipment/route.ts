import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const PACKLINK_API_URL = process.env.PACKLINK_API_URL!;
const PACKLINK_API_KEY = process.env.PACKLINK_API_KEY!;

const FROM_NAME        = process.env.PACKLINK_FROM_NAME        ?? '';
const FROM_SURNAME     = process.env.PACKLINK_FROM_SURNAME     ?? '';
const FROM_STREET      = process.env.PACKLINK_FROM_STREET      ?? '';
const FROM_CITY        = process.env.PACKLINK_FROM_CITY        ?? '';
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE ?? '';
const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY     || 'ES';
const FROM_PHONE       = process.env.PACKLINK_FROM_PHONE       ?? '';
const FROM_EMAIL       = process.env.PACKLINK_FROM_EMAIL       ?? '';

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { service_id, coste_envio_final, ancho, alto, largo } = await req.json();

  // 1. Leer el pedido completo
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('*, customer:customers(*), order_items(*)')
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (order.status !== 'listo_envio') {
    return NextResponse.json({ error: 'El pedido no está listo para envío' }, { status: 400 });
  }

  const address = order.customer?.direccion_envio as any;

  // Split contacto_nombre into name + surname for Packlink
  const fullName  = (order.customer?.contacto_nombre ?? '') as string;
  const spaceIdx  = fullName.indexOf(' ');
  const toName    = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
  const toSurname = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : (order.customer?.company_name ?? '');

  // 2. Crear envío en Packlink — formato correcto según API
  const shipmentBody = {
    service_id,
    from: {
      name:     FROM_NAME,
      surname:  FROM_SURNAME,
      street1:  FROM_STREET,
      city:     FROM_CITY,
      zip_code: FROM_POSTAL_CODE,
      country:  FROM_COUNTRY,
      phone:    FROM_PHONE,
      email:    FROM_EMAIL,
    },
    to: {
      name:     toName,
      surname:  toSurname,
      company:  order.customer?.company_name,
      street1:  address?.street,
      city:     address?.city,
      zip_code: address?.postal_code || '',
      country:  address?.country     || 'ES',
      phone:    order.customer?.telefono ?? FROM_PHONE,
      email:    order.customer?.email,
    },
    packages: [{
      weight: order.peso_total,
      width:  ancho,
      height: alto,
      length: largo,
    }],
    content:      `Pedido ${id.slice(0, 8)}`,
    contentvalue: order.total_productos,
  };

  console.log('[shipment] body:', JSON.stringify(shipmentBody, null, 2));

  try {
    const res = await fetch(`${PACKLINK_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': PACKLINK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentBody),
    });

    const responseText = await res.text();
    console.log('[shipment] Packlink status:', res.status);
    console.log('[shipment] Packlink response:', responseText);

    if (!res.ok) {
      return NextResponse.json({ error: `Packlink ${res.status}: ${responseText}` }, { status: 502 });
    }

    const shipment = JSON.parse(responseText);

    // 3. Actualizar pedido en Supabase
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status:               'enviado',
        packlink_shipment_id: shipment.shipment_reference ?? shipment.id ?? shipment.reference,
        tracking_url:         shipment.tracking_url ?? shipment.carrier_tracking_url ?? null,
        coste_envio_final,
        paquete_ancho:        ancho,
        paquete_alto:         alto,
        paquete_largo:        largo,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[shipment] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, shipment_reference: shipment.shipment_reference });

  } catch (err: any) {
    console.error('[shipment]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
