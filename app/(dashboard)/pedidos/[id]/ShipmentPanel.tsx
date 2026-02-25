'use client';

import { useState } from 'react';

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
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export function ShipmentPanel({ orderId, pesoTotal, destination }: Props) {
  const [ancho, setAncho] = useState('');
  const [alto, setAlto]   = useState('');
  const [largo, setLargo] = useState('');
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
        body: JSON.stringify({ peso: pesoTotal, ancho: parseFloat(ancho), alto: parseFloat(alto), largo: parseFloat(largo), destination }),
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
      window.location.reload();
    } catch (err: any) { setError(err.message); setGenerating(false); }
  }

  return (
    <div className="bg-white border border-[#D93A35]/20 rounded-xl p-4 space-y-4">
      {/* Dimensions */}
      <div>
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400 mb-3">Package dimensions (cm)</div>
        <div className="grid grid-cols-3 gap-3">
          {[['Width', ancho, setAncho], ['Height', alto, setAlto], ['Length', largo, setLargo]].map(([label, value, setter]: any) => (
            <div key={label} className="space-y-1">
              <label className="text-[11px] text-gray-400">{label}</label>
              <input type="number" min="1" value={value} onChange={(e) => setter(e.target.value)} placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors" />
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Total weight: <span className="text-gray-700 font-mono font-semibold">{pesoTotal} kg</span>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D93A35]">{error}</div>
      )}

      <button onClick={requestQuotes} disabled={loading}
        className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-[#D93A35]/40 disabled:opacity-40 transition-colors">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
            Querying Packlink…
          </span>
        ) : 'Get quotes'}
      </button>

      {quotes.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Shipping options</div>
          {quotes.map((q) => (
            <button key={q.service_id} onClick={() => setSelectedQuote(q)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                selectedQuote?.service_id === q.service_id
                  ? 'border-[#D93A35]/40 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
              <div>
                <div className="text-sm font-semibold text-gray-900">{q.carrier}</div>
                <div className="text-xs text-gray-400">{q.service_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{q.estimated_days} days</div>
              </div>
              <div className="text-sm font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(q.price)}</div>
            </button>
          ))}
        </div>
      )}

      {selectedQuote && (
        <button onClick={generateShipment} disabled={generating}
          className="w-full py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
          {generating ? 'Generating shipment…' : `Generate Shipment · ${fmt(selectedQuote.price)}`}
        </button>
      )}
    </div>
  );
}
