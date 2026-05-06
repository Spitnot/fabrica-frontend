// components/fr/StatusChip.tsx
// Status chip — fully filled, no grey filler. Mono label, letter-spaced.
import React from 'react';

export type FRStatus =
  | 'draft' | 'confirmado' | 'produccion' | 'listo_envio' | 'esperando_pago' | 'enviado' | 'cancelado';

const META: Record<FRStatus, { label: string; bg: string; fg: string }> = {
  draft:          { label: 'DRAFT',       bg: '#E6883E',  fg: '#fff' },
  confirmado:     { label: 'CONFIRMED',   bg: '#0087B8',  fg: '#fff' },
  produccion:     { label: 'IN PROD',     bg: '#876693',  fg: '#fff' },
  listo_envio:    { label: 'READY',       bg: '#F6E451',  fg: '#000' },
  esperando_pago: { label: 'TO PAY',      bg: '#E6883E',  fg: '#fff' },
  enviado:        { label: 'SHIPPED',     bg: '#0DA265',  fg: '#fff' },
  cancelado:      { label: 'CANCELLED',   bg: '#D93A35',  fg: '#fff' },
};

export function StatusChip({ status, size = 'md' }:
  { status: FRStatus; size?: 'sm' | 'md' | 'lg' }) {
  const m = META[status];
  const pad = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';
  const fs  = size === 'sm' ? 10       : size === 'lg' ? 13         : 11;
  const bg = m.bg;
  const fg = m.fg;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, background: bg, color: fg,
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontWeight: 700, fontSize: fs,
      letterSpacing: '0.14em',
    }}>{m.label}</span>
  );
}
