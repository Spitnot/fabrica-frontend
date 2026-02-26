export const COLOR_MAP: Record<string, string> = {
  black: '#111111', negro: '#111111',
  white: '#f5f5f5', blanco: '#f5f5f5',
  red: '#D93A35', rojo: '#D93A35',
  blue: '#1a56db', azul: '#1a56db',
  navy: '#1e3a5f', marino: '#1e3a5f',
  green: '#15803d', verde: '#15803d',
  pink: '#ec4899', rosa: '#ec4899',
  yellow: '#eab308', amarillo: '#eab308',
  orange: '#f97316', naranja: '#f97316',
  purple: '#9333ea', morado: '#9333ea', lila: '#a855f7',
  brown: '#92400e', marron: '#92400e', marrón: '#92400e',
  gray: '#6b7280', grey: '#6b7280', gris: '#6b7280',
  beige: '#d4b896',
  cream: '#fdf0dc', crema: '#fdf0dc',
  ivory: '#fffff0',
  coral: '#ff6b6b',
  teal: '#0d9488',
  camel: '#c19a6b',
  khaki: '#c3b091', caqui: '#c3b091',
};

export function getColorHex(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  for (const [mapKey, hex] of Object.entries(COLOR_MAP)) {
    if (key.includes(mapKey)) return hex;
  }
  return null;
}

/** Parse "Color / Size" → { color, size } */
export function parseVariant(title: string | undefined): { color: string | null; size: string | null } {
  if (!title) return { color: null, size: null };
  const parts = title.split('/').map((s) => s.trim());
  if (parts.length >= 2) return { color: parts[0], size: parts[1] };
  const hex = getColorHex(parts[0]);
  return hex ? { color: parts[0], size: null } : { color: null, size: parts[0] };
}
