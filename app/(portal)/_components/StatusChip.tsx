/**
 * Status chip + color dot — match the storefront's flat, ink-line aesthetic.
 *
 * No rounded pills, no "soft tint" backgrounds — a square chip with a
 * 1px black border, a status-colored dot, and uppercase mono label.
 * Inline-styled (no Tailwind) so it ports cleanly anywhere.
 */

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  confirmado: 'Confirmed',
  produccion: 'In Production',
  listo_envio: 'Ready to Ship',
  enviado: 'Shipped',
  cancelado: 'Cancelled',
};

const STATUS_DOT: Record<string, string> = {
  draft:       '#9ca3af',
  confirmado:  '#0087B8',
  produccion:  '#E07B3A',
  listo_envio: '#6B5BD5',
  enviado:     '#5BB85A',
  cancelado:   '#D93A35',
};

export function StatusChip({ status }: { status: string }) {
  const dot = STATUS_DOT[status] ?? '#9ca3af';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid #111',
        background: '#fff',
        padding: '3px 8px 3px 7px',
        fontFamily: 'var(--fr-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          background: dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/* Solid square color dot for variant swatches — matches the storefront's
   tiny color dots under each product card. */
export function ColorDot({
  hex,
  size = 14,
  active = false,
}: { hex: string; size?: number; active?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: hex,
        border: active ? '2px solid #111' : '1px solid rgba(0,0,0,0.2)',
        boxShadow: active ? 'inset 0 0 0 2px #fff' : 'none',
        flexShrink: 0,
      }}
    />
  );
}
