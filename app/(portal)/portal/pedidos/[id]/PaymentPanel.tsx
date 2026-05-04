'use client';

import { useState } from 'react';

interface PaymentPanelProps {
  orderId: string;
  orderState: string;
  totalAmount: number;
  currency: string;
  orderReference: string;
}

export function PaymentPanel({ orderId, orderState, totalAmount, currency, orderReference }: PaymentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (orderState !== 'confirmado') return null;

  async function handleInitiatePayment() {
    try {
      setLoading(true); setError(null);
      const response = await fetch(`/api/pedidos/${orderId}/payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to initiate payment'); }
      const { checkout_url } = await response.json();
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);

  return (
    <div className="fr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="fr-label">Online Payment</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Pago Online</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #111', background: '#F7F7F2' }}>
        <span className="fr-label">Referencia del pedido</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{orderReference}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #0DA265' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Total a pagar</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 28, color: '#0DA265', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalAmount)}</span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', border: '1px solid #D93A35', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>
          Error al procesar pago: {error}
        </div>
      )}

      <button onClick={handleInitiatePayment} disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#0DA265', borderColor: '#0DA265' }}>
        {loading ? 'Procesando…' : 'Proceder al Pago (Revolut)'}
      </button>

      <div style={{ padding: '10px 14px', border: '1px solid #0087B8', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0087B8' }}>
        Pago 100% seguro — serás redirigido a Revolut. Tus datos están protegidos.
      </div>

      <div style={{ borderTop: '1px solid #111', paddingTop: 12 }}>
        <div className="fr-label" style={{ marginBottom: 8 }}>Métodos de pago aceptados</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[['MC', '#D93A35'], ['V', '#0087B8'], ['R', '#111']].map(([label, bg]) => (
            <span key={label} style={{ width: 28, height: 18, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900 }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
