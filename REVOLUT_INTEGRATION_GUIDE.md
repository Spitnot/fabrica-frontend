# 🚀 Guía de Integración: Revolut Merchant API en Firma Rollers B2B

**Etapa:** PAGO ONLINE  
**Stack:** Next.js 16, TypeScript, Supabase  
**Entorno:** Sandbox → Producción  

---

## 📋 TABLA DE CONTENIDOS
1. [Paso 0: Setup - Variables de entorno y API Keys](#paso-0-setup)
2. [Paso 1: Crear estructura de tipos TypeScript](#paso-1-tipos)
3. [Paso 2: Crear servicio de Revolut](#paso-2-servicio)
4. [Paso 3: Crear tabla de `revolut_payments` en BD](#paso-3-base-datos)
5. [Paso 4: Ruta API - Crear pago](#paso-4-ruta-crear-pago)
6. [Paso 5: Ruta API - Webhook handler](#paso-5-webhook)
7. [Paso 6: UI - Botón de pago en pedido](#paso-6-ui)
8. [Paso 7: Transiciones de estado de orden](#paso-7-estados)
9. [Paso 8: Testing en Sandbox](#paso-8-testing)
10. [Paso 9: Deploy a Producción](#paso-9-produccion)

---

## PASO 0: Setup - Variables de entorno y API Keys {#paso-0-setup}

### 0.1 Obtener API Keys de Revolut

**En Revolut Business Dashboard:**
1. Ir a: **Settings → APIs → Merchant API**
2. Generar **Secret Key** (usa en servidor)
3. Generar **Public Key** (usa en cliente, NO NECESARIA para Hosted Checkout)
4. Obtener **Merchant ID** (identificador único)

**Para Sandbox:**
- Base URL: `https://sandbox-merchant.revolut.com`
- Para Testing: [Tarjetas de prueba](https://developer.revolut.com/docs/guides/accept-payments/get-started/test-implementation/test-cards)

**Para Producción:**
- Base URL: `https://merchant.revolut.com`

### 0.2 Agregar variables de entorno

**Archivo:** `.env.local` (local) / **Vercel Secrets** (producción)

```bash
# Revolut Merchant API
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox  # 'sandbox' o 'production'
REVOLUT_SECRET_KEY=sk_live_xxxxx_o_sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID=your_merchant_id
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx  # Se genera en dashboard

# Webhook: URL pública donde Revolut enviará eventos
REVOLUT_WEBHOOK_URL=https://b2b.firmarollers.com/api/webhooks/revolut
```

### 0.3 Registrar webhook en Revolut Dashboard

**En Revolut Business → Settings → APIs → Webhooks:**
1. URL: `https://b2b.firmarollers.com/api/webhooks/revolut`
2. Suscribirse a eventos:
   - `ORDER_COMPLETED`
   - `ORDER_AUTHORISED` (si usas manual capture)
   - `ORDER_CANCELLED`
   - `ORDER_FAILED`
   - `ORDER_PAYMENT_FAILED`
   - `ORDER_PAYMENT_DECLINED`
3. Guardar **Webhook Secret** → `REVOLUT_WEBHOOK_SECRET`

---

## PASO 1: Crear estructura de tipos TypeScript {#paso-1-tipos}

**Archivo:** `lib/types/revolut.ts`

```typescript
/**
 * Tipos para integración Revolut Merchant API
 */

// Respuesta de creación de orden
export interface RevolutOrderResponse {
  id: string;
  token: string;
  type: 'payment';
  state: 'pending' | 'processing' | 'completed' | 'authorised' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  outstanding_amount: number;
  capture_mode: 'automatic' | 'manual';
  checkout_url: string;
  enforce_challenge: 'automatic' | 'always' | 'never';
  payments?: RevolutPaymentDetails[];
  merchant_order_data?: {
    reference?: string;
    [key: string]: any;
  };
}

// Detalles de pago dentro de una orden
export interface RevolutPaymentDetails {
  id: string;
  order_id: string;
  state: 'completed' | 'failed' | 'declined' | 'processing';
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  method: string;
  billing_address?: {
    country_code: string;
  };
  [key: string]: any;
}

// Payload para crear orden
export interface RevolutOrderPayload {
  amount: number; // En unidad mínima (p.ej., centavos)
  currency: string; // ISO 4217
  description?: string;
  customer?: {
    email: string;
    [key: string]: any;
  };
  redirect_url?: string;
  merchant_order_data?: {
    reference?: string;
    [key: string]: any;
  };
  expire_pending_after?: string; // ISO 8601 duration
}

// Webhook event
export interface RevolutWebhookEvent {
  id: string;
  created_at: string;
  event_type: 
    | 'ORDER_COMPLETED'
    | 'ORDER_AUTHORISED'
    | 'ORDER_CANCELLED'
    | 'ORDER_FAILED'
    | 'ORDER_PAYMENT_FAILED'
    | 'ORDER_PAYMENT_DECLINED';
  data: {
    order?: RevolutOrderResponse;
    payment?: RevolutPaymentDetails;
    [key: string]: any;
  };
}

// Registro en BD de Supabase
export interface RevolutPaymentRecord {
  id: string; // UUID
  order_id: string; // ID de orden en Firma Rollers
  customer_id: string; // UUID de cliente en Supabase
  revolut_order_id: string; // ID de orden en Revolut
  revolut_payment_id?: string;
  amount: number; // En EUR (moneda)
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  checkout_url: string;
  merchant_reference: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  revolut_response: RevolutOrderResponse; // Raw response
  metadata?: Record<string, any>;
}
```

---

## PASO 2: Crear servicio de Revolut {#paso-2-servicio}

**Archivo:** `lib/revolut/revolutService.ts`

```typescript
import {
  RevolutOrderPayload,
  RevolutOrderResponse,
} from '@/lib/types/revolut';

const REVOLUT_BASE_URL =
  process.env.NEXT_PUBLIC_REVOLUT_ENVIRONMENT === 'production'
    ? 'https://merchant.revolut.com'
    : 'https://sandbox-merchant.revolut.com';

const REVOLUT_SECRET_KEY = process.env.REVOLUT_SECRET_KEY;
const REVOLUT_MERCHANT_ID = process.env.REVOLUT_MERCHANT_ID;

if (!REVOLUT_SECRET_KEY) {
  throw new Error('REVOLUT_SECRET_KEY is not defined');
}

if (!REVOLUT_MERCHANT_ID) {
  throw new Error('REVOLUT_MERCHANT_ID is not defined');
}

/**
 * Crear una orden de pago en Revolut
 * Devuelve checkout_url para redirigir al cliente
 */
export async function createRevolutOrder(
  payload: RevolutOrderPayload,
): Promise<RevolutOrderResponse> {
  const url = `${REVOLUT_BASE_URL}/api/orders`;

  const headers = {
    'Authorization': `Bearer ${REVOLUT_SECRET_KEY}`,
    'Revolut-Api-Version': '2024-01-01',
    'Content-Type': 'application/json',
    'Idempotency-Key': `${Date.now()}-${Math.random()}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Revolut API Error]', response.status, errorData);
      throw new Error(
        `Revolut API error: ${response.status} - ${errorData}`
      );
    }

    const data: RevolutOrderResponse = await response.json();
    console.log('[Revolut] Order created:', data.id);
    return data;
  } catch (error) {
    console.error('[Revolut] Failed to create order:', error);
    throw error;
  }
}

/**
 * Recuperar detalles de una orden
 */
export async function getRevolutOrder(
  orderId: string,
): Promise<RevolutOrderResponse> {
  const url = `${REVOLUT_BASE_URL}/api/orders/${orderId}`;

  const headers = {
    'Authorization': `Bearer ${REVOLUT_SECRET_KEY}`,
    'Revolut-Api-Version': '2024-01-01',
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Revolut API Error]', response.status, errorData);
      throw new Error(
        `Revolut API error: ${response.status} - ${errorData}`
      );
    }

    const data: RevolutOrderResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[Revolut] Failed to retrieve order:', error);
    throw error;
  }
}

/**
 * Cancelar una orden
 */
export async function cancelRevolutOrder(orderId: string): Promise<void> {
  const url = `${REVOLUT_BASE_URL}/api/orders/${orderId}/cancel`;

  const headers = {
    'Authorization': `Bearer ${REVOLUT_SECRET_KEY}`,
    'Revolut-Api-Version': '2024-01-01',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Revolut API Error]', response.status, errorData);
      throw new Error(
        `Revolut API error: ${response.status} - ${errorData}`
      );
    }

    console.log('[Revolut] Order cancelled:', orderId);
  } catch (error) {
    console.error('[Revolut] Failed to cancel order:', error);
    throw error;
  }
}

/**
 * Verificar firma de webhook (HMAC SHA256)
 */
export function verifyRevolutWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[Revolut Webhook] REVOLUT_WEBHOOK_SECRET not configured');
    return false;
  }

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
```

---

## PASO 3: Crear tabla de `revolut_payments` en BD {#paso-3-base-datos}

**En Supabase SQL Editor:**

```sql
-- Crear tabla revolut_payments
CREATE TABLE revolut_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- IDs de Revolut
  revolut_order_id TEXT NOT NULL UNIQUE,
  revolut_payment_id TEXT,
  
  -- Monto y moneda
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Estado de pago
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- URLs de Revolut
  checkout_url TEXT NOT NULL,
  
  -- Datos de Firma Rollers
  merchant_reference TEXT NOT NULL, -- order_id en Firma Rollers
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Errores
  error_message TEXT,
  
  -- Raw Revolut response
  revolut_response JSONB,
  
  -- Metadata adicional
  metadata JSONB,
  
  -- Índices
  INDEX idx_customer_id (customer_id),
  INDEX idx_order_id (order_id),
  INDEX idx_revolut_order_id (revolut_order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);

-- Enable RLS
ALTER TABLE revolut_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Admin y managers pueden ver todos los pagos
CREATE POLICY "admin_manager_select_all" ON revolut_payments
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Policy: Clientes ven solo sus propios pagos
CREATE POLICY "customer_select_own" ON revolut_payments
  FOR SELECT USING (
    customer_id = auth.jwt() ->> 'sub'
  );

-- Policy: Solo admin puede insertar
CREATE POLICY "admin_insert_all" ON revolut_payments
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy: Solo admin puede actualizar
CREATE POLICY "admin_update_all" ON revolut_payments
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

---

## PASO 4: Ruta API - Crear pago {#paso-4-ruta-crear-pago}

**Archivo:** `app/api/orders/[id]/payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createRevolutOrder } from '@/lib/revolut/revolutService';
import { RevolutOrderPayload } from '@/lib/types/revolut';

/**
 * POST /api/orders/[id]/payment
 * Crea un pago en Revolut para una orden existente
 * 
 * Body: (vacío, usamos datos de la orden)
 * Response: { checkout_url, revolut_order_id }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const orderId = params.id;
    const supabase = await createSupabaseServerClient();

    // 1. Verificar usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Obtener orden desde BD
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, total_amount, currency, reference')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    // 3. Verificar que el usuario sea dueño de la orden (cliente) o admin
    const { data: customer } = await supabase
      .from('customers')
      .select('id, email, nombre_empresa')
      .eq('id', order.customer_id)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    // Verificar permisos
    const userRole = userData.user.user_metadata?.role;
    if (userRole !== 'admin' && userData.user.id !== customer.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    // 4. Verificar si ya existe un pago para esta orden
    const { data: existingPayment } = await supabase
      .from('revolut_payments')
      .select('id, status, checkout_url')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .single();

    if (existingPayment) {
      // Devolver pago existente pendiente
      return NextResponse.json(
        {
          checkout_url: existingPayment.checkout_url,
          revolut_order_id: existingPayment.id,
          message: 'Existing pending payment found',
        },
        { status: 200 },
      );
    }

    // 5. Crear orden en Revolut
    const revolutPayload: RevolutOrderPayload = {
      amount: Math.round(order.total_amount * 100), // En centavos
      currency: order.currency || 'EUR',
      description: `Pedido ${order.reference}`,
      customer: {
        email: customer.email,
      },
      merchant_order_data: {
        reference: order.id, // ID de Firma Rollers
      },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/orders/${orderId}/payment-confirmed`,
      expire_pending_after: 'PT24H', // 24 horas
    };

    const revolutOrder = await createRevolutOrder(revolutPayload);

    // 6. Guardar en revolut_payments
    const { error: insertError } = await supabase
      .from('revolut_payments')
      .insert({
        order_id: orderId,
        customer_id: order.customer_id,
        revolut_order_id: revolutOrder.id,
        amount: order.total_amount,
        currency: order.currency || 'EUR',
        status: 'pending',
        checkout_url: revolutOrder.checkout_url,
        merchant_reference: order.id,
        revolut_response: revolutOrder,
      });

    if (insertError) {
      console.error('[API] Error saving payment:', insertError);
      return NextResponse.json(
        { error: 'Failed to save payment' },
        { status: 500 },
      );
    }

    // 7. Devolver checkout_url
    return NextResponse.json(
      {
        checkout_url: revolutOrder.checkout_url,
        revolut_order_id: revolutOrder.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] Payment creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## PASO 5: Ruta API - Webhook handler {#paso-5-webhook}

**Archivo:** `app/api/webhooks/revolut/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyRevolutWebhookSignature } from '@/lib/revolut/revolutService';
import { RevolutWebhookEvent } from '@/lib/types/revolut';

/**
 * POST /api/webhooks/revolut
 * Recibe eventos de Revolut Merchant API
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('X-Revolut-Signature') || '';

    // 1. Verificar firma del webhook
    if (!verifyRevolutWebhookSignature(payload, signature)) {
      console.warn('[Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      );
    }

    // 2. Parsear evento
    const event: RevolutWebhookEvent = JSON.parse(payload);
    console.log('[Webhook] Event received:', event.event_type, event.id);

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
    console.error('[Webhook] Error processing:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}

/**
 * Manejar ORDER_COMPLETED o ORDER_AUTHORISED
 */
async function handleOrderCompleted(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  if (!event.data.order) return;

  const order = event.data.order;
  const revolutOrderId = order.id;
  const firstPayment = order.payments?.[0];

  // 1. Encontrar pago en BD
  const { data: payment, error } = await supabase
    .from('revolut_payments')
    .select('id, order_id, status')
    .eq('revolut_order_id', revolutOrderId)
    .single();

  if (error || !payment) {
    console.warn('[Webhook] Payment not found:', revolutOrderId);
    return;
  }

  // Si ya está completado, no procesar
  if (payment.status === 'completed') {
    return;
  }

  // 2. Actualizar revolut_payments
  await supabase
    .from('revolut_payments')
    .update({
      status: 'completed',
      revolut_payment_id: firstPayment?.id,
      completed_at: new Date().toISOString(),
      revolut_response: order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  console.log('[Webhook] Payment completed:', payment.id);

  // 3. Actualizar estado de orden
  // Pasar de 'confirmado' a 'produccion' (iniciamos producción)
  await supabase
    .from('orders')
    .update({
      estado: 'produccion',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id)
    .eq('estado', 'confirmado'); // Solo si está confirmado

  console.log('[Webhook] Order transitioned to produccion:', payment.order_id);

  // 4. (OPCIONAL) Enviar email de confirmación de pago
  // await sendPaymentConfirmationEmail(payment.order_id);
}

/**
 * Manejar ORDER_CANCELLED o ORDER_FAILED
 */
async function handleOrderCancelled(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  if (!event.data.order) return;

  const order = event.data.order;
  const revolutOrderId = order.id;

  // 1. Encontrar pago
  const { data: payment } = await supabase
    .from('revolut_payments')
    .select('id, order_id')
    .eq('revolut_order_id', revolutOrderId)
    .single();

  if (!payment) return;

  // 2. Actualizar revolución payments
  await supabase
    .from('revolut_payments')
    .update({
      status: 'cancelled',
      revolut_response: order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  // 3. Cancelar orden en Firma Rollers si no ha sido procesada
  await supabase
    .from('orders')
    .update({
      estado: 'cancelado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id)
    .in('estado', ['confirmado']); // Solo si no ha entrado en producción

  console.log('[Webhook] Order cancelled:', payment.order_id);
}

/**
 * Manejar ORDER_PAYMENT_FAILED o ORDER_PAYMENT_DECLINED
 */
async function handlePaymentFailed(
  supabase: any,
  event: RevolutWebhookEvent,
) {
  if (!event.data.payment) return;

  const payment = event.data.payment;

  // Encontrar pago
  const { data: paymentRecord } = await supabase
    .from('revolut_payments')
    .select('id')
    .eq('revolut_payment_id', payment.id)
    .single();

  if (!paymentRecord) return;

  // Actualizar con error
  await supabase
    .from('revolut_payments')
    .update({
      error_message: `Payment ${event.event_type}: ${payment.state}`,
      revolut_response: { payment },
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentRecord.id);

  console.log('[Webhook] Payment failed:', payment.id, event.event_type);

  // NO cancelamos la orden todavía — el cliente puede reintentar
  // (la misma checkout_url sigue siendo válida)
}
```

---

## PASO 6: UI - Botón de pago en pedido {#paso-6-ui}

**Archivo:** `app/(portal)/orders/[id]/PaymentPanel.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PaymentPanelProps {
  orderId: string;
  orderState: string;
  totalAmount: number;
  currency: string;
}

export function PaymentPanel({
  orderId,
  orderState,
  totalAmount,
  currency,
}: PaymentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Solo mostrar si el pedido está confirmado y no ha sido pagado
  if (orderState !== 'confirmado') {
    return null;
  }

  async function handleInitiatePayment() {
    try {
      setLoading(true);
      setError(null);

      // 1. Llamar a ruta API para crear orden en Revolut
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate payment');
      }

      const { checkout_url } = await response.json();

      // 2. Redirigir a checkout de Revolut
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Pago Online</h2>

      <div className="space-y-4">
        {/* Monto a pagar */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-green-600">
            {totalAmount.toFixed(2)} {currency}
          </span>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Botón de pago */}
        <button
          onClick={handleInitiatePayment}
          disabled={loading}
          className={`w-full py-3 px-4 rounded font-semibold transition ${
            loading
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? 'Procesando...' : 'Proceder al Pago (Revolut)'}
        </button>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center">
          Serás redirigido a Revolut para completar el pago de forma segura
        </p>
      </div>
    </div>
  );
}
```

**Usar en página de orden:**

```typescript
// app/(portal)/orders/[id]/page.tsx
import { PaymentPanel } from './PaymentPanel';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  // ... obtener order ...

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {/* Detalles de orden */}
      </div>

      <div className="lg:col-span-1">
        <PaymentPanel
          orderId={order.id}
          orderState={order.estado}
          totalAmount={order.total_amount}
          currency={order.currency}
        />
      </div>
    </div>
  );
}
```

---

## PASO 7: Transiciones de estado de orden {#paso-7-estados}

**Actualizar diagrama de estados en CLAUDE.md:**

```
ANTIGUO:
draft → confirmado → produccion → listo_envio → enviado

NUEVO (CON PAGO):
confirmado → [PAGO PENDIENTE] → produccion → listo_envio → enviado → cerrado
               ↓ (webhook ORDER_COMPLETED)
          Pasa a produccion automáticamente

Estado "confirmado" = Orden confirmada pero PAGO PENDIENTE
Estado "produccion" = Pago completado, iniciamos fabricación
```

**Reglas importantes:**

1. **Los pedidos se crean en estado "confirmado"** (sin saltar draft)
2. **Pago es OPCIONAL para admin** — pueden marcar orden como pagada manualmente
3. **Para clientes es OBLIGATORIO** — botón de pago visible hasta que webhook de Revolut la mueva a "produccion"
4. **Si pago falla/expira** — webhook cancela la orden

---

## PASO 8: Testing en Sandbox {#paso-8-testing}

### 8.1 Test básico local

```bash
# 1. Asegurarse que variables de entorno están en .env.local
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID=your_merchant_id
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx

# 2. Iniciar servidor local
npm run dev

# 3. En navegador
# → Ir a portal de cliente → Crear orden → Ver botón "Proceder al Pago"
# → Click → Debería redirigir a Revolut Sandbox Checkout
```

### 8.2 Tarjetas de prueba (Sandbox Revolut)

```
✅ Pago exitoso:
   Card: 4111 1111 1111 1111
   Exp: 12/25
   CVC: 123

❌ Pago rechazado:
   Card: 4000 0000 0000 0002
   Exp: 12/25
   CVC: 123

❌ Pago fallido:
   Card: 4000 0000 0000 0119
   Exp: 12/25
   CVC: 123
```

### 8.3 Verificar webhook en Sandbox

```bash
# 1. Usar tool como ngrok o Vercel preview
#    para exponer localhost a HTTPS

# 2. En Revolut Sandbox Dashboard:
#    Settings → APIs → Webhooks → Registrar
#    URL: https://your-ngrok-url.com/api/webhooks/revolut

# 3. Hacer pago de prueba → Webhook debería llegar

# 4. Verificar en logs:
#    [Webhook] Event received: ORDER_COMPLETED
```

### 8.4 Checklist de testing

- [ ] Crear orden con monto de prueba
- [ ] Iniciar pago → Redirigir a checkout Revolut
- [ ] Completar con tarjeta exitosa → Webhook ORDER_COMPLETED
- [ ] Verificar BD: revolut_payments status = 'completed'
- [ ] Verificar BD: orders estado = 'produccion'
- [ ] Iniciar pago con tarjeta rechazada → Ver error
- [ ] Webhook ORDER_PAYMENT_DECLINED llega
- [ ] Reintentar en misma checkout_url funciona
- [ ] Admin puede ver histórico de pagos

---

## PASO 9: Deploy a Producción {#paso-9-produccion}

### 9.1 Variables de entorno en Vercel

**En Vercel Dashboard → Project → Settings → Environment Variables:**

```
NEXT_PUBLIC_REVOLUT_ENVIRONMENT = production
REVOLUT_SECRET_KEY = sk_live_xxxxx (PRODUCTION KEY)
REVOLUT_MERCHANT_ID = your_merchant_id
REVOLUT_WEBHOOK_SECRET = whsec_xxxxx (production webhook secret)
REVOLUT_WEBHOOK_URL = https://b2b.firmarollers.com/api/webhooks/revolut
```

### 9.2 Registrar webhook en Revolut Producción

**En Revolut Business Producción Dashboard:**

1. Settings → APIs → Webhooks
2. URL: `https://b2b.firmarollers.com/api/webhooks/revolut`
3. Suscribirse a eventos: `ORDER_COMPLETED`, `ORDER_CANCELLED`, `ORDER_FAILED`, `ORDER_PAYMENT_FAILED`
4. Guardar **Webhook Secret** → actualizar en Vercel

### 9.3 Deploy

```bash
# 1. Commit con cambios
git add -A
git commit -m "feat: revolut payment integration"

# 2. Push a main
git push origin main

# 3. Vercel auto-deploya
# 4. Verificar en https://b2b.firmarollers.com

# 5. Hacer pago de prueba pequeño (1€)
# 6. Verificar webhook llega
# 7. Verificar BD actualiza correctamente
```

### 9.4 Monitoreo post-deploy

**Cosas que revisar:**

- [ ] Logs de Vercel sin errores
- [ ] Un pago de prueba exitoso
- [ ] Webhook recibido y procesado
- [ ] Email de confirmación de pago enviado (si está implementado)
- [ ] Orden pasó de "confirmado" a "produccion"
- [ ] Revolut Dashboard muestra transacción

---

## 📚 REFERENCIAS FINALES

| Documento | Link |
|-----------|------|
| Revolut Merchant API Docs | https://developer.revolut.com/docs/merchant/merchant-api |
| Hosted Checkout Page API | https://developer.revolut.com/docs/guides/accept-payments/online-payments/hosted-checkout-page/api |
| Test Cards | https://developer.revolut.com/docs/guides/accept-payments/get-started/test-implementation/test-cards |
| Webhooks | https://developer.revolut.com/docs/merchant/webhooks |
| Orders Reference | https://developer.revolut.com/docs/merchant/orders |

---

## 🎯 RESUMEN: ¿QUÉ PASÓ?

1. ✅ Cliente ve botón "Proceder al Pago" en orden confirmada
2. ✅ Click → Crea orden en Revolut vía API
3. ✅ Cliente redirigido a checkout Revolut (hosted)
4. ✅ Cliente paga con tarjeta/Apple Pay/Google Pay
5. ✅ Revolut envía webhook `ORDER_COMPLETED`
6. ✅ Backend recibe webhook, actualiza BD
7. ✅ Orden cambia a "produccion" automáticamente
8. ✅ Admin ve pago confirmado en histórico

**Todo seguro:** Secret Key nunca se expone al cliente, verificación de firmas en webhooks, uso de Hosted Checkout (PCI DSS out-of-scope).

