'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  status: string;
}

export function OrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function advance(newStatus: string) {
    setLoading(newStatus);
    const body = new URLSearchParams({ status: newStatus });
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    router.refresh();
    setLoading(null);
  }

  const btn = 'px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg transition-colors disabled:opacity-40';

  return (
    <>
      {status === 'confirmado' && (
        <button
          onClick={() => advance('produccion')}
          disabled={loading !== null}
          className={`${btn} text-gray-700 hover:border-orange-300 hover:text-[#b85e00]`}
        >
          {loading === 'produccion' ? 'Updating…' : '→ Move to Production'}
        </button>
      )}
      {status === 'produccion' && (
        <button
          onClick={() => advance('listo_envio')}
          disabled={loading !== null}
          className={`${btn} text-gray-700 hover:border-purple-300 hover:text-[#876693]`}
        >
          {loading === 'listo_envio' ? 'Updating…' : '→ Mark Ready to Ship'}
        </button>
      )}
      {status !== 'cancelado' && status !== 'enviado' && status !== 'listo_envio' && (
        <button
          onClick={() => advance('cancelado')}
          disabled={loading !== null}
          className={`${btn} text-[#D93A35] border-red-200 hover:bg-red-50`}
        >
          {loading === 'cancelado' ? 'Cancelling…' : 'Cancel'}
        </button>
      )}
    </>
  );
}
