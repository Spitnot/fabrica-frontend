/**
 * app/api/pedidos/[id]/payment/route.ts
 * POST /api/pedidos/[id]/payment
 * 
 * Crea un pago en Revolut para una orden existente
 * ARREGLADO PARA NEXT.JS 16: params es Promise
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { createRevolutOrder } from '@/lib/revolut/revolutService';
import { RevolutOrderPayload } from '@/lib/types/revolut';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;

    // 1. Verificar usuario autenticado (con sesión del cliente)
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Obtener orden desde BD (supabaseAdmin para saltar RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, total_productos, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[Payment API] Order not found:', orderId, orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    // 3. Obtener customer
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, email, company_name')
      .eq('id', order.customer_id)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    // 4. Verificar permisos
    // Admin puede crear pagos para cualquier orden
    // Clientes solo para sus propias órdenes
    const userRole = userData.user.user_metadata?.role;
    if (userRole !== 'admin' && userData.user.id !== customer.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    // 5. Verificar si ya existe un pago pendiente
    const { data: existingPayment } = await supabaseAdmin
      .from('revolut_payments')
      .select('id, status, checkout_url')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .single();

    if (existingPayment) {
      // Devolver pago existente pendiente
      console.log('[Payment API] Reusing existing pending payment:', existingPayment.id);
      return NextResponse.json(
        {
          checkout_url: existingPayment.checkout_url,
          revolut_order_id: existingPayment.id,
          message: 'Existing pending payment found',
        },
        { status: 200 },
      );
    }

    // 6. Crear orden en Revolut
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://b2b.firmarollers.com';
    const revolutPayload: RevolutOrderPayload = {
      amount: Math.round(order.total_productos * 100),
      currency: 'EUR',
      description: `Pedido ${orderId.slice(0, 8).toUpperCase()}`,
      customer: {
        email: customer.email,
      },
      merchant_order_data: {
        reference: orderId,
      },
      redirect_url: `${appUrl}/portal/pedidos/${orderId}/payment-confirmed`,
      expire_pending_after: 'PT24H',
    };

    console.log('[Payment API] Creating Revolut order:', {
      orderId,
      amount: revolutPayload.amount,
      currency: revolutPayload.currency,
    });

    const revolutOrder = await createRevolutOrder(revolutPayload);

    // 7. Guardar en revolut_payments
    const { error: insertError } = await supabaseAdmin
      .from('revolut_payments')
      .insert({
        order_id: orderId,
        customer_id: order.customer_id,
        revolut_order_id: revolutOrder.id,
        amount: order.total_productos,
        currency: 'EUR',
        status: 'pending',
        checkout_url: revolutOrder.checkout_url,
        merchant_reference: order.id,
        revolut_response: revolutOrder,
      });

    if (insertError) {
      console.error('[Payment API] Error saving payment:', insertError);
      return NextResponse.json(
        { error: 'Failed to save payment' },
        { status: 500 },
      );
    }

    console.log('[Payment API] Payment saved successfully:', revolutOrder.id);

    // 8. Devolver checkout_url
    return NextResponse.json(
      {
        checkout_url: revolutOrder.checkout_url,
        revolut_order_id: revolutOrder.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[Payment API] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
