/**
 * app/api/webhooks/revolut/route.ts
 * POST /api/webhooks/revolut
 * 
 * Recibe eventos de Revolut Merchant API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyRevolutWebhookSignature } from '@/lib/revolut/revolutService';
import { RevolutWebhookEvent } from '@/lib/types/revolut';

interface WebhookPaymentRecord {
  id: string;
  order_id: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('X-Revolut-Signature') || '';

    console.log('[Webhook] Received event, verifying signature...');

    // 1. Verificar firma del webhook
    if (!verifyRevolutWebhookSignature(payload, signature)) {
      console.warn('[Webhook] Invalid signature, rejecting');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      );
    }

    // 2. Parsear evento
    let event: RevolutWebhookEvent;
    try {
      event = JSON.parse(payload);
    } catch (e) {
      console.error('[Webhook] Failed to parse JSON:', e);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 },
      );
    }

    console.log('[Webhook] Event verified and parsed:', {
      eventType: event.event_type,
      eventId: event.id,
      orderId: event.data.order?.id,
    });

    const supabase = await createSupabaseServerClient();

    // 3. Procesar según tipo de evento
    switch (event.event_type) {
      case 'ORDER_COMPLETED':
      case 'ORDER_AUTHORISED':
        await handleOrderCompleted(supabase, event);
        break;

      case 'ORDER_CANCELLED':
      case 'ORDER_FAILED':
        await handleOrderCancelled(supabase, event);
        break;

      case 'ORDER_PAYMENT_FAILED':
      case 'ORDER_PAYMENT_DECLINED':
        await handlePaymentFailed(supabase, event);
        break;

      default:
        console.log('[Webhook] Unhandled event type:', event.event_type);
    }

    // 4. Confirmar recepción
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}

/**
 * Manejar ORDER_COMPLETED o ORDER_AUTHORISED
 * El pago fue exitoso, actualizar BD y cambiar estado de orden
 */
async function handleOrderCompleted(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  try {
    if (!event.data.order) {
      console.warn('[Webhook] ORDER_COMPLETED without order data');
      return;
    }

    const order = event.data.order;
    const revolutOrderId = order.id;
    const firstPayment = order.payments?.[0];

    console.log('[Webhook] Processing ORDER_COMPLETED:', revolutOrderId);

    // 1. Encontrar pago en BD
    const { data: payment, error } = await supabase
      .from('revolut_payments')
      .select('id, order_id, status')
      .eq('revolut_order_id', revolutOrderId)
      .single();

    if (error) {
      console.error('[Webhook] Payment lookup error:', error);
      return;
    }

    if (!payment) {
      console.warn('[Webhook] Payment not found:', revolutOrderId);
      return;
    }

    // Si ya está completado, no procesar de nuevo
    if (payment.status === 'completed') {
      console.log('[Webhook] Payment already completed, skipping');
      return;
    }

    // 2. Actualizar revolut_payments
    const { error: updateError } = await supabase
      .from('revolut_payments')
      .update({
        status: 'completed',
        revolut_payment_id: firstPayment?.id,
        completed_at: new Date().toISOString(),
        revolut_response: order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[Webhook] Failed to update revolut_payments:', updateError);
      return;
    }

    console.log('[Webhook] Payment marked as completed:', payment.id);

    // 3. Actualizar estado de orden: esperando_pago → enviado
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'enviado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id)
      .eq('status', 'esperando_pago')
      .select();

    if (orderUpdateError) {
      console.error('[Webhook] Failed to update order state:', orderUpdateError);
      return;
    }

    if (updatedOrder && updatedOrder.length > 0) {
      console.log('[Webhook] Order transitioned to enviado:', payment.order_id);
    } else {
      console.log('[Webhook] Order was not in listo_envio state, not transitioning');
    }

    // 4. (OPCIONAL) Aquí podrías enviar email de confirmación
    // await sendPaymentConfirmationEmail(payment.order_id);
  } catch (error) {
    console.error('[Webhook] Error in handleOrderCompleted:', error);
  }
}

/**
 * Manejar ORDER_CANCELLED o ORDER_FAILED
 * El pago fue cancelado o expiró, cancelar orden
 */
async function handleOrderCancelled(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  try {
    if (!event.data.order) {
      console.warn('[Webhook] ORDER_CANCELLED without order data');
      return;
    }

    const order = event.data.order;
    const revolutOrderId = order.id;

    console.log('[Webhook] Processing ORDER_CANCELLED/FAILED:', revolutOrderId);

    // 1. Encontrar pago
    const { data: payment, error: paymentError } = await supabase
      .from('revolut_payments')
      .select('id, order_id')
      .eq('revolut_order_id', revolutOrderId)
      .single();

    if (paymentError) {
      console.error('[Webhook] Payment lookup error:', paymentError);
      return;
    }

    if (!payment) {
      console.warn('[Webhook] Payment not found:', revolutOrderId);
      return;
    }

    // 2. Actualizar revolut_payments
    const { error: updatePaymentError } = await supabase
      .from('revolut_payments')
      .update({
        status: 'cancelled',
        revolut_response: order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('[Webhook] Failed to update revolut_payments:', updatePaymentError);
      return;
    }

    // El pago se activa en listo_envio — si se cancela NO cancelamos el pedido,
    // el cliente puede reintentar el pago desde el portal.
    console.log('[Webhook] Payment cancelled/failed at listo_envio, order kept intact:', payment.order_id);
  } catch (error) {
    console.error('[Webhook] Error in handleOrderCancelled:', error);
  }
}

/**
 * Manejar ORDER_PAYMENT_FAILED o ORDER_PAYMENT_DECLINED
 * El intento de pago falló, registrar error pero NO cancelar orden
 * (el cliente puede reintentar con la misma checkout_url)
 */
async function handlePaymentFailed(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  try {
    if (!event.data.payment) {
      console.warn('[Webhook] ORDER_PAYMENT_FAILED without payment data');
      return;
    }

    const payment = event.data.payment;

    console.log('[Webhook] Processing ORDER_PAYMENT_FAILED/DECLINED:', payment.id);

    // Encontrar pago
    const { data: paymentRecord, error } = await supabase
      .from('revolut_payments')
      .select('id')
      .eq('revolut_payment_id', payment.id)
      .single();

    if (error) {
      console.log('[Webhook] Payment record not found (may be first attempt)');
      return;
    }

    if (!paymentRecord) return;

    // Actualizar con error, pero mantener status como pending
    // Así el cliente puede reintentar
    const { error: updateError } = await supabase
      .from('revolut_payments')
      .update({
        error_message: `${event.event_type}: ${payment.state}`,
        revolut_response: { payment },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('[Webhook] Failed to update payment error:', updateError);
      return;
    }

    console.log('[Webhook] Payment error logged:', payment.id, event.event_type);

    // NO cancelamos la orden — el cliente puede reintentar
    // (la misma checkout_url sigue siendo válida)
  } catch (error) {
    console.error('[Webhook] Error in handlePaymentFailed:', error);
  }
}
