import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendShippingEmail } from '@/lib/emailService';

interface Props { params: Promise<{ id: string }> }

// POST — Create shipment and update order status
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // 1. Insert shipment (assuming you have a 'shipments' table)
    // If you use Packlink or similar, that logic goes here.
    // For now, we just update the order status.
    
    // 2. Update order with final shipping cost and status
    const updatePayload: Record<string, unknown> = { status: 'enviado' }
    if (body.coste_envio_final != null) updatePayload.coste_envio_final = body.coste_envio_final
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Fetch order details to return to frontend
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();

    
// Enviar email de shipping al cliente
    if (order?.customer) {
      const customer = order.customer as any;
      if (customer.email) {
        await sendShippingEmail(
          customer.email,
          customer.contacto_nombre,
          id,
          undefined,
          undefined,
          customer.id,
          id,
        );
      }
    }

    return NextResponse.json({ success: true, order });  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}