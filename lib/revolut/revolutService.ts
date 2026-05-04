/**
 * lib/revolut/revolutService.ts
 * Cliente para Revolut Merchant API
 */

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
