'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Quote {
  service_id: string;
  carrier: string;
  service_name: string;
  price: number;
  estimated_days: number;
}

interface Props {
  orderId: string;
  pesoTotal: number;
  destination: { street: string; city: string; postal_code: string; country: string; };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

export function ShipmentPanel({ orderId, pesoTotal, destination }: Props) {
  const router = useRouter();
  const [ancho, setAncho] = useState('');
  const [alto, setAlto]   = useState('');
  const [largo, setLargo] = useState('');
  const [pesoAjustado, setPesoAjustado] = useState(String(pesoTotal));
  const [quotes, setQuotes]             = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading]           = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState('');

  async function requestQuotes() {
    if (!ancho || !alto || !largo) { setError('Enter all package dimensions.'); return; }
    setError(''); setLoading(true); setQuotes([]); setSelectedQuote(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso: parseFloat(pesoAjustado) || pesoTotal, ancho: parseFloat(ancho), alto: parseFloat(alto), largo: parseFloat(largo), destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error quoting');
      setQuotes(data.data ?? []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function generateShipment() {
    if (!selectedQuote) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: selectedQuote.service_id, coste_envio_final: selectedQuote.price, ancho: parseFloat(ancho), alto: parseFloat(alto), largo: parseFloat(largo) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error generating shipment');
      router.refresh();
    } catch (err: any) { setError(err.message); setGenerating(false); }
  }

  return (
    <div className="fr-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Dimensions */}
      <div>
        <div className="fr-label" style={{ marginBottom: 12 }}>Package dimensions (cm)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['Width', ancho, setAncho], ['Height', alto, setAlto], ['Length', largo, setLargo]].map(([label, value, setter]: any) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="fr-label">{label}</label>
              <input type="number" min="1" value={value} onChange={(e) => setter(e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="fr-label">Weight (kg)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min="0.01" step="0.01" value={pesoAjustado} onChange={(e) => setPesoAjustado(e.target.value)} style={{ width: 120 }} />
            {parseFloat(pesoAjustado) !== pesoTotal && (
              <span className="fr-label">(order: {pesoTotal} kg)</span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', border: '1px solid #D93A35', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>{error}</div>
      )}

      <button onClick={requestQuotes} disabled={loading} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Querying Packlink…' : 'Get quotes'}
      </button>

      {quotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="fr-label">Shipping options</div>
          {quotes.map((q) => (
            <button key={q.service_id} onClick={() => setSelectedQuote(q)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 12, border: '1px solid #111',
                boxShadow: selectedQuote?.service_id === q.service_id ? 'none' : '2px 2px 0 #111',
                background: selectedQuote?.service_id === q.service_id ? '#F7F7F2' : '#fff',
                textAlign: 'left', width: '100%',
                transform: selectedQuote?.service_id === q.service_id ? 'translate(2px,2px)' : 'none',
              }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{q.carrier}</div>
                <div className="fr-label">{q.service_name}</div>
                <div className="fr-label">{q.estimated_days} days</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 18, color: '#D93A35', fontVariantNumeric: 'tabular-nums' }}>{fmt(q.price)}</div>
                {selectedQuote?.service_id === q.service_id && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#0DA265', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    ✓ Selected
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedQuote && (
        <button onClick={generateShipment} disabled={generating} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {generating ? 'Generating shipment…' : `Generate Shipment · ${fmt(selectedQuote.price)}`}
        </button>
      )}
    </div>
  );
}
