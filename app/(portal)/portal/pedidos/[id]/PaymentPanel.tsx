/**
 * app/(portal)/pedidos/[id]/PaymentPanel.tsx
 * 
 * Panel de pago para clientes — muestra botón de pago en Revolut
 * Solo visible cuando orden está en estado "confirmado"
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentPanelProps {
  orderId: string;
  orderState: string;
  totalAmount: number;
  currency: string;
  orderReference: string;
}

export function PaymentPanel({
  orderId,
  orderState,
  totalAmount,
  currency,
  orderReference,
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

      console.log('[PaymentPanel] Initiating payment for order:', orderId);

      // 1. Llamar a ruta API para crear orden en Revolut - ARREGLADO: /orders/ → /pedidos/
      const response = await fetch(`/api/pedidos/${orderId}/payment`, {
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

      console.log('[PaymentPanel] Redirecting to checkout URL');

      // 2. Redirigir a checkout de Revolut
      window.location.href = checkout_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PaymentPanel] Error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Pago Online</h2>

      <div className="space-y-4">
        {/* Referencia de pedido */}
        <div className="text-sm text-gray-600 pb-2 border-b border-gray-100">
          <span className="font-medium">Referencia del pedido:</span> {orderReference}
        </div>

        {/* Monto a pagar */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <span className="text-gray-700 font-medium">Total a pagar:</span>
          <span className="text-3xl font-bold text-green-600">
            {totalAmount.toFixed(2)}
            <span className="text-lg ml-2">{currency}</span>
          </span>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Error al procesar pago</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Botón de pago */}
        <button
          onClick={handleInitiatePayment}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            loading
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h10m4 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
              Proceder al Pago (Revolut)
            </>
          )}
        </button>

        {/* Info seguridad */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-xs text-blue-800">
              <p className="font-semibold">Pago 100% seguro</p>
              <p className="mt-1">Serás redirigido a Revolut para completar el pago. Tus datos están protegidos.</p>
            </div>
          </div>
        </div>

        {/* Métodos aceptados */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">Métodos de pago aceptados:</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-6 h-4 bg-gradient-to-r from-red-600 to-orange-600 rounded text-white flex items-center justify-center text-[10px] font-bold">
                MC
              </span>
              Tarjeta
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-6 h-4 bg-blue-600 rounded text-white flex items-center justify-center text-[10px] font-bold">
                V
              </span>
              Visa
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-6 h-4 bg-gradient-to-r from-gray-700 to-gray-900 rounded text-white flex items-center justify-center text-[10px] font-bold">
                R
              </span>
              Revolut
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
