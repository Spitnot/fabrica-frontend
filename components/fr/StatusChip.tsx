// components/fr/StatusChip.tsx
// Status chip — fully filled, no grey filler. Mono label, letter-spaced.
import React from 'react';

export type FRStatus =
  | 'draft' | 'confirmado' | 'produccion' | 'listo_envio' | 'enviado' | 'cancelado';

const META: Record<FRStatus, { label: string; bg: string; fg: string }> = {
  draft:       { label: 'DRAFT',     bg: '#000',     fg: '#fff' },
  confirmado:  { label: 'CONFIRMED', bg: '#0087B8',  fg: '#fff' },
  produccion:  { label: 'IN PROD',   bg: '#F6E451',  fg: '#000' },
  listo_envio: { label: 'READY',     bg: '#0DA265',  fg: '#fff' },
  enviado:     { label: 'SHIPPED',   bg: '#876693',  fg: '#fff' },
  cancelado:   { label: 'CANCELLED', bg: '#D93A35',  fg: '#fff' },
};

export function StatusChip({ status, size = 'md', inverted = false }:
  { status: FRStatus; size?: 'sm' | 'md' | 'lg'; inverted?: boolean }) {
  const m = META[status];
  const pad = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';
  const fs  = size === 'sm' ? 10       : size === 'lg' ? 13         : 11;
  // When the chip sits on a dark surface and its native bg is dark, swap to
  // the brand yellow so it stays legible.
  const darkBg = m.bg === '#000' || m.bg === '#111111';
  const bg = inverted && darkBg ? '#F6E451' : m.bg;
  const fg = inverted && darkBg ? '#111'    : m.fg;
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
