import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Packlink doesn't support HMAC — we protect the endpoint with a shared secret
// in the query string. Register the webhook URL in Packlink as:
//   https://b2b.firmarollers.com/api/packlink/webhook?secret=<PACKLINK_WEBHOOK_SECRET>
function verifySecret(req: NextRequest): boolean {
  const secret = process.env.PACKLINK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[packlink webhook] PACKLINK_WEBHOOK_SECRET not configured');
    return false;
  }
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('[packlink webhook] received:', JSON.stringify(body, null, 2));

    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const reference    = event.shipment_reference ?? event.reference;
      const tracking_url = event.tracking_url ?? event.carrier_tracking_url;
      const status       = event.state ?? event.status;

      if (!reference) continue;

      console.log('[packlink webhook] processing:', reference, status, tracking_url);

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('packlink_shipment_id', reference)
        .single();

      if (!order) {
        console.warn('[packlink webhook] order not found for reference:', reference);
        continue;
      }

      const updates: Record<string, any> = {};
      if (tracking_url) updates.tracking_url = tracking_url;

      if (status) {
        const statusMap: Record<string, string> = {
          'DELIVERED':        'enviado',
          'IN_TRANSIT':       'enviado',
          'OUT_FOR_DELIVERY': 'enviado',
          'READY_FOR_PICKUP': 'enviado',
        };
        const mappedStatus = statusMap[status];
        if (mappedStatus && order.status !== mappedStatus) {
          updates.status = mappedStatus;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseAdmin
          .from('orders')
          .update(updates)
          .eq('id', order.id);

        if (error) {
          console.error('[packlink webhook] update error:', error.message);
        } else {
          console.log('[packlink webhook] updated order:', order.id, updates);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[packlink webhook] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Packlink may GET to verify the endpoint is alive
export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, endpoint: 'packlink-webhook' });
}
