// components/fr/Atoms.tsx
// Shared brand primitives lifted from the mockup.
import React, { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

// Back link — used on detail pages.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontWeight: 700, fontSize: 10, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: '#888', textDecoration: 'none',
    }}>← {children}</Link>
  );
}

export const FR = {
  red: '#D93A35', orange: '#E6883E', yellow: '#F6E451',
  green: '#0DA265', blue: '#0087B8', purple: '#876693',
  ink: '#111111', white: '#FFFFFF', cream: '#F7F7F2',
};

export function Display({ size = 24, weight = 800, children, style = {} }:
  { size?: number; weight?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
      fontWeight: weight, fontSize: size, lineHeight: 0.95,
      letterSpacing: weight >= 800 ? '-0.04em' : '-0.025em',
      textTransform: 'uppercase', color: FR.ink, ...style,
    }}>{children}</div>
  );
}

export function Mono({ size = 13, weight = 500, children, style = {} }:
  { size?: number; weight?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontWeight: weight, fontSize: size, color: FR.ink, ...style,
    }}>{children}</span>
  );
}

export function Block({ children, bg = FR.white, style = {} }:
  { children: ReactNode; bg?: string; style?: CSSProperties }) {
  return (
    <div style={{
      background: bg, border: '2px solid #111', ...style,
    }}>{children}</div>
  );
}

export function Rule({ thick = false, color = FR.ink }: { thick?: boolean; color?: string }) {
  return <div style={{ height: thick ? 2 : 1, background: color, width: '100%' }} />;
}

// KPI cell — used in dashboard strip and stat rows. Color the value, keep label ink.
export function KPI({ label, value, accent = FR.ink, sub, bg = FR.white }:
  { label: string; value: ReactNode; accent?: string; sub?: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg, border: '2px solid #111', padding: 18 }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
        fontWeight: 900, fontSize: 56, lineHeight: 1, marginTop: 10,
        letterSpacing: '-0.04em', color: accent,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sub}</div>}
    </div>
  );
}

// Page header — title + eyebrow + right-side actions. Pattern reused on every list page.
export function PageHeader({ eyebrow, title, count, actions }:
  { eyebrow?: string; title: string; count?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
      <div>
        {eyebrow && <Mono size={10} weight={700} style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>{eyebrow}</Mono>}
        <Display size={38} weight={900} style={{ marginTop: 6 }}>
          {title}<span style={{ color: FR.red }}>.</span>
        </Display>
        {count && <div style={{ marginTop: 8 }}><Mono size={11}>{count}</Mono></div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

// Filter tab strip — used on Orders, Clients indexes.
export function FilterTabs<T extends string>({ tabs, value, onChange }:
  { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', border: '2px solid #111', marginBottom: 16, background: FR.white }}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: '0 0 auto', padding: '12px 20px',
              borderLeft: i === 0 ? 'none' : '2px solid #111',
              background: active ? FR.ink : FR.white,
              color: active ? FR.white : FR.ink,
              boxShadow: 'none', border: 'none',
              fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
              fontWeight: 900, fontSize: 11, letterSpacing: '0.14em',
              textTransform: 'uppercase', display: 'flex', gap: 8, alignItems: 'baseline',
            }}>
            {t.label}
            {t.count !== undefined && (
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 500, fontSize: 11, color: active ? FR.yellow : '#888' }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
