'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props { orderId: string; status: string; }

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

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {status === 'confirmado' && (
        <button
          onClick={() => advance('produccion')}
          disabled={loading !== null}
          style={{ background: '#E6883E', color: '#fff', borderColor: '#E6883E' }}
        >
          {loading === 'produccion' ? 'Updating…' : '→ Production'}
        </button>
      )}
      {status === 'produccion' && (
        <button
          onClick={() => advance('listo_envio')}
          disabled={loading !== null}
          style={{ background: '#876693', color: '#fff', borderColor: '#876693' }}
        >
          {loading === 'listo_envio' ? 'Updating…' : '→ Ready to Ship'}
        </button>
      )}
      {status !== 'cancelado' && status !== 'enviado' && status !== 'listo_envio' && (
        <button
          onClick={() => advance('cancelado')}
          disabled={loading !== null}
          className="btn-ghost"
          style={{ color: '#D93A35', borderColor: '#D93A35' }}
        >
          {loading === 'cancelado' ? 'Cancelling…' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
