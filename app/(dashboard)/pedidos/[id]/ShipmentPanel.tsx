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
  destination: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export function ShipmentPanel({ orderId, pesoTotal, destination }: Props) {
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [largo, setLargo] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function requestQuotes() {
    if (!ancho || !alto || !largo) {
      setError('Introduce todas las dimensiones del paquete.');
      return;
    }
    setError('');
    setLoading(true);
    setQuotes([]);
    setSelectedQuote(null);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: pesoTotal,
          ancho: parseFloat(ancho),
          alto: parseFloat(alto),
          largo: parseFloat(largo),
          destination,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cotizar');
      setQuotes(data.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateShipment() {
    if (!selectedQuote) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedQuote.service_id,
          coste_envio_final: selectedQuote.price,
          ancho: parseFloat(ancho),
          alto: parseFloat(alto),
          largo: parseFloat(largo),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al generar envío');
      // Recargar la página para ver el estado actualizado
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  }

  return (
    <div className="bg-[#141414] border border-amber-400/20 rounded-lg p-4 space-y-4">

      {/* Dimensiones */}
      <div>
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500 mb-3">
          Dimensiones del paquete (cm)
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ancho', value: ancho, setter: setAncho },
            { label: 'Alto',  value: alto,  setter: setAlto },
            { label: 'Largo', value: largo, setter: setLargo },
          ].map(({ label, value, setter }) => (
            <div key={label} className="space-y-1">
              <label className="text-[11px] text-zinc-500">{label}</label>
              <input
                type="number"
                min="1"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder="0"
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 outline-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-zinc-600">
          Peso total: <span className="text-zinc-400 font-mono">{pesoTotal} kg</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-950 border border-red-900 rounded-md text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Botón cotizar */}
      <button
        onClick={requestQuotes}
        disabled={loading}
        className="w-full py-2 bg-[#1c1c1c] border border-[#333] rounded-md text-sm font-semibold text-zinc-300 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
            Consultando Packlink…
          </span>
        ) : 'Solicitar cotización'}
      </button>

      {/* Quotes */}
      {quotes.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500">
            Opciones de envío
          </div>
          {quotes.map((q) => (
            <button
              key={q.service_id}
              onClick={() => setSelectedQuote(q)}
              className={`w-full flex items-center justify-between p-3 rounded-md border transition-colors text-left ${
                selectedQuote?.service_id === q.service_id
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-[#282828] hover:border-[#333]'
              }`}
            >
              <div>
                <div className="text-sm font-medium text-zinc-200">{q.carrier}</div>
                <div className="text-xs text-zinc-500">{q.service_name}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{q.estimated_days} días</div>
              </div>
              <div className="text-sm font-bold text-amber-400">{fmt(q.price)}</div>
            </button>
          ))}
        </div>
      )}

      {/* Generar envío */}
      {selectedQuote && (
        <button
          onClick={generateShipment}
          disabled={generating}
          className="w-full py-2.5 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 disabled:opacity-40 transition-colors"
        >
          {generating ? 'Generando envío…' : `Generar Envío · ${fmt(selectedQuote.price)}`}
        </button>
      )}
    </div>
  );
}
