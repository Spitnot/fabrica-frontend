import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendShippingEmail } from '@/lib/emailService'

const PACKLINK_API_URL = process.env.PACKLINK_API_URL!
const PACKLINK_API_KEY = process.env.PACKLINK_API_KEY!
const FROM_NAME        = process.env.PACKLINK_FROM_NAME!
const FROM_STREET      = process.env.PACKLINK_FROM_STREET!
const FROM_CITY        = process.env.PACKLINK_FROM_CITY!
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE!
const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY!
const FROM_PHONE       = process.env.PACKLINK_FROM_PHONE!
const FROM_EMAIL       = process.env.PACKLINK_FROM_EMAIL!

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const body = await req.json()
    const { service_id, coste_envio_final, ancho, alto, largo } = body

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
    const address = customer?.direccion_envio as any

    let shipmentRef: string | null = null
    let trackingUrl: string | null = null

    if (service_id && PACKLINK_API_KEY) {
      const shipmentBody = {
        service_id,
        from: {
          name:     FROM_NAME,
          street1:  FROM_STREET,
          city:     FROM_CITY,
          zip_code: FROM_POSTAL_CODE,
          country:  FROM_COUNTRY,
          phone:    FROM_PHONE,
          email:    FROM_EMAIL,
        },
        to: {
          name:     customer?.contacto_nombre ?? customer?.company_name,
          company:  customer?.company_name,
          street1:  address?.street,
          city:     address?.city,
          zip_code: address?.postal_code,
          country:  address?.country ?? 'ES',
          phone:    customer?.telefono ?? FROM_PHONE,
          email:    customer?.email,
        },
        packages: [{
          weight: order.peso_total || 1,
          width:  ancho ?? 20,
          height: alto  ?? 20,
          length: largo ?? 20,
        }],
        content:      `Pedido ${id.slice(0, 8).toUpperCase()}`,
        contentvalue: order.total_productos ?? 0,
      }

      const plRes = await fetch(`${PACKLINK_API_URL}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': PACKLINK_API_KEY,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(shipmentBody),
      })

      if (plRes.ok) {
        const plData = await plRes.json()
        shipmentRef = plData.shipment_reference ?? plData.reference ?? null
        trackingUrl = plData.tracking_url ?? plData.carrier_tracking_url ?? null
        console.log('[shipment] Packlink draft creado:', shipmentRef)
      } else {
        const errText = await plRes.text()
        console.error('[shipment] Packlink error:', plRes.status, errText)
      }
    }

    const updatePayload: Record<string, unknown> = { status: 'enviado' }
    if (coste_envio_final != null) updatePayload.coste_envio_final    = coste_envio_final
    if (shipmentRef)               updatePayload.packlink_shipment_id = shipmentRef
    if (trackingUrl)               updatePayload.tracking_url         = trackingUrl
    if (ancho)                     updatePayload.paquete_ancho        = ancho
    if (alto)                      updatePayload.paquete_alto         = alto
    if (largo)                     updatePayload.paquete_largo        = largo

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) throw updateError

    if (customer?.email) {
      sendShippingEmail(
        customer.email,
        customer.contacto_nombre ?? customer.company_name,
        `#${id.slice(0, 8).toUpperCase()}`,
        trackingUrl ?? undefined,
        undefined,
        customer.id,
        id,
      ).catch((e: any) => console.error('[shipment] Email failed silently:', e.message))
    }

    return NextResponse.json({ success: true, shipment_reference: shipmentRef })

  } catch (err: any) {
    console.error('[shipment] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
