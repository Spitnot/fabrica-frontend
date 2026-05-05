'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FR } from '@/components/fr/Atoms';

const FAQ = [
  {
    q: '¿Cómo hago un pedido?',
    a: 'Desde el portal, haz clic en "New Order", añade los productos que necesitas y confirma. Recibirás confirmación inmediata y podrás seguir el estado en tiempo real.',
  },
  {
    q: '¿Cuándo se procesa mi pedido?',
    a: 'Los pedidos confirmados entran en producción en 24–48h laborables. Una vez listo para enviar (estado "Ready to Ship") recibirás la opción de pago y, tras confirmarlo, se tramita el envío.',
  },
  {
    q: '¿Cómo funciona el pago?',
    a: 'El pago se activa cuando el pedido llega al estado "Ready to Ship" — así los costes de envío ya están confirmados. El pago es online mediante Revolut (tarjeta o transferencia).',
  },
  {
    q: '¿Cuáles son los plazos de envío?',
    a: 'España peninsular: 24–48h. Europa: 3–7 días laborables según el transportista. Al confirmar el pedido verás las opciones disponibles con estimación de días.',
  },
  {
    q: '¿Puedo modificar o cancelar un pedido?',
    a: 'Los pedidos en estado "Confirmed" o "In Production" pueden cancelarse contactando con nosotros antes de que pasen a "Ready to Ship". A partir de ese estado el pedido ya está preparado y no puede modificarse.',
  },
  {
    q: '¿Cómo consulto el seguimiento de mi envío?',
    a: 'Una vez enviado, el pedido mostrará un enlace de tracking directo en la página de detalle del pedido.',
  },
  {
    q: '¿Cuál es el pedido mínimo?',
    a: 'El mínimo depende de tu tarifa de cliente. Puedes verlo al crear un pedido — si no llegas al mínimo, el portal te lo indica con el importe que falta.',
  },
  {
    q: '¿Cómo actualizo mi dirección de envío o datos fiscales?',
    a: 'Ve a la sección "Profile" del portal. Puedes actualizar tu dirección de envío y datos de contacto directamente. Para cambios en datos fiscales contacta con nosotros.',
  },
];

const SUBJECTS = [
  { value: 'order',    label: 'Order inquiry' },
  { value: 'shipping', label: 'Shipping question' },
  { value: 'billing',  label: 'Billing / payment' },
  { value: 'account',  label: 'Account & access' },
  { value: 'other',    label: 'Other' },
];

export default function AyudaPage() {
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const [subject, setSubject]     = useState('order');
  const [message, setMessage]     = useState('');
  const [orderId, setOrderId]     = useState('');
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [sendError, setSendError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || sent) return;
    setSending(true); setSendError('');
    try {
      const res = await fetch('/api/portal/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, orderId: orderId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setSent(true);
      setMessage(''); setOrderId('');
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fr-page" style={{ maxWidth: 760 }}>

      {/* Header */}
      <div>
        <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
          HELP<span style={{ color: FR.red }}>.</span>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.1em', marginTop: 6 }}>
          FAQ · CONTACT
        </div>
      </div>

      {/* FAQ */}
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div className="fr-section-head">FAQ</div>
        <div>
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid rgba(17,17,17,0.1)' : 'none' }}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                    padding: '14px 18px', cursor: 'pointer', boxShadow: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{item.q}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, color: FR.red, flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {open && (
                  <div style={{ padding: '0 18px 16px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, lineHeight: 1.8, color: 'rgba(17,17,17,0.7)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact form */}
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div className="fr-section-head">CONTACT US</div>
        <div style={{ padding: '20px 18px' }}>

          {sent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ padding: '12px 16px', border: '1px solid #0DA265', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#0DA265' }}>
                ✓ Message sent — we'll get back to you within one business day.
              </div>
              <button
                onClick={() => setSent(false)}
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: '#111', padding: 0 }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none' }}
                  >
                    {SUBJECTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                    Order ID <span style={{ opacity: 0.5 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={e => setOrderId(e.target.value)}
                    placeholder="e.g. A1B2C3D4"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe your question or issue…"
                  style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none', resize: 'vertical', minHeight: 100 }}
                />
              </div>

              {sendError && (
                <div style={{ padding: '8px 12px', border: `1px solid ${FR.red}`, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red }}>
                  ✕ {sendError}
                </div>
              )}

              <button
                type="submit"
                disabled={sending || message.trim().length < 10}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: 11, letterSpacing: '0.14em' }}
              >
                {sending ? 'SENDING…' : 'SEND MESSAGE'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(17,17,17,0.1)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="mailto:wholesale@firmarollers.com" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: FR.red }}>✉</span> wholesale@firmarollers.com
            </a>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.4)', alignSelf: 'center' }}>
              Reply within 1 business day
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
