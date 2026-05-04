/**
 * lib/types/revolut.ts
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
