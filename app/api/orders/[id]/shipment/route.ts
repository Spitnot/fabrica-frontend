import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendShippingEmail } from '@/lib/emailService';

interface Props { params: Promise<{ id: string }> }

const PACKLINK_API_KEY = process.env.PACKLINK_API_KEY!
const PACKLINK_API_URL = process.env.PACKLINK_API_URL!
const FROM_NAME        = process.env.PACKLINK_FROM_NAME!
const FROM_STREET      = process.env.PACKLINK_FROM_STREET!
const FROM_CITY        = process.env.PACKLINK_FROM_CITY!
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE!
const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY ?? 'ES'
const FROM_PHONE       = process.env.PACKLINK_FROM_PHONE!
const FROM_EMAIL       = process.env.PACKLINK_FROM_EMAIL!

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { service_id, coste_envio_final, ancho, alto, largo } = body as {
      service_id: string
      coste_envio_final?: number
      ancho: number
      alto: number
      largo: number
    }

    // 1. Fetch order + customer
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const customer = order.customer as any
    const addr     = customer.direccion_envio as any ?? {}

    // 2. Create Packlink draft
    const shipmentBody = {
      service_id,
      from: {
        name:     FROM_NAME,
        street1:  FROM_STREET,
        city:     FROM_CITY,
        zipCode:  FROM_POSTAL_CODE,
        country:  FROM_COUNTRY,
        phone:    FROM_PHONE,
        email:    FROM_EMAIL,
      },
      to: {
        name:    customer.contacto_nombre ?? customer.company_name,
        street1: addr.street      ?? '',
        city:    addr.city        ?? '',
        zipCode: addr.postal_code ?? '',
        country: addr.country     ?? 'ES',
        phone:   customer.telefono ?? FROM_PHONE,
        email:   customer.email,
      },
      packages: [{
        weight: order.peso_total ?? 1,
        width:  Math.round(ancho),
        height: Math.round(alto),
        length: Math.round(largo),
      }],
      content:      `Order ${id.slice(0, 8).toUpperCase()}`,
      contentvalue: order.total_productos ?? 0,
    }

    console.log('[shipment] Sending to Packlink:', JSON.stringify(shipmentBody, null, 2))

    const packlinkRes = await fetch(`${PACKLINK_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': PACKLINK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentBody),
    })

    const packlinkText = await packlinkRes.text()
    console.log('[shipment] Packlink status:', packlinkRes.status)
    console.log('[shipment] Packlink response:', packlinkText)

    if (!packlinkRes.ok) {
      return NextResponse.json(
        { error: `Packlink ${packlinkRes.status}: ${packlinkText}` },
        { status: 502 }
      )
    }

    const shipment    = JSON.parse(packlinkText)
    const shipmentRef = shipment.shipment_reference ?? shipment.reference ?? shipment.id

    // 3. Update order in Supabase
    const updatePayload: Record<string, unknown> = {
      status:               'enviado',
      packlink_shipment_id: shipmentRef,
      tracking_url:         shipment.tracking_url ?? shipment.carrier_tracking_url ?? null,
      paquete_ancho:        ancho,
      paquete_alto:         alto,
      paquete_largo:        largo,
    }
    if (coste_envio_final != null) updatePayload.coste_envio_final = coste_envio_final

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) throw updateError

    // 4. Send email — isolated, never blocks the response
    if (customer?.email) {
      sendShippingEmail(
        customer.email,
        customer.contacto_nombre ?? customer.company_name,
        `#${id.slice(0, 8).toUpperCase()}`,
        shipment.tracking_url ?? undefined,
        undefined,
        customer.id,
        id,
      ).catch((e: any) =>
        console.error('[shipment] Email failed silently:', e.message)
      )
    }

    return NextResponse.json({ success: true, shipment_reference: shipmentRef });

  } catch (err: any) {
    console.error('[shipment] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
