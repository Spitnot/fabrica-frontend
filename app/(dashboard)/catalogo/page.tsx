import { NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_TOKEN  = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

const QUERY = `
  query GetProducts {
    products(first: 250) {
      edges {
        node {
          id
          title
          status
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 50) {
            edges {
              node {
                sku
                title
                price
                inventoryItem {
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

type Variant = {
  sku: string;
  variante?: string;
  precio: number;
  peso_kg: number;
};

type Product = {
  id: string;
  title: string;
  image?: string;
  variants: Variant[];
};

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({ query: QUERY }),
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json.errors) return [];

    return json.data.products.edges.map(({ node: p }: any) => {
      const image = p.images.edges[0]?.node?.url as string | undefined;
      const variants: Variant[] = p.variants.edges
        .filter(({ node: v }: any) => v.sku)
        .map(({ node: v }: any) => {
          const w = v.inventoryItem?.measurement?.weight;
          let peso_kg = w?.value ?? 0;
          if (w?.unit === 'GRAMS')  peso_kg = peso_kg / 1000;
          if (w?.unit === 'POUNDS') peso_kg = peso_kg * 0.453592;
          if (w?.unit === 'OUNCES') peso_kg = peso_kg * 0.0283495;
          return {
            sku: v.sku,
            variante: v.title !== 'Default Title' ? v.title : undefined,
            precio: parseFloat(v.price),
            peso_kg: parseFloat(peso_kg.toFixed(3)),
          };
        });
      return { id: p.id, title: p.title, image, variants };
    });
  } catch {
    return [];
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// Common color name → CSS color mapping
const COLOR_MAP: Record<string, string> = {
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

function getColorHex(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  for (const [mapKey, hex] of Object.entries(COLOR_MAP)) {
    if (key.includes(mapKey)) return hex;
  }
  return null;
}

// Parse "Color / Size" → { color, size }
function parseVariant(title: string | undefined): { color: string | null; size: string | null } {
  if (!title) return { color: null, size: null };
  const parts = title.split('/').map((s) => s.trim());
  if (parts.length >= 2) return { color: parts[0], size: parts[1] };
  // Single value — guess if it's a color or size
  const hex = getColorHex(parts[0]);
  return hex ? { color: parts[0], size: null } : { color: null, size: parts[0] };
}

export default async function CatalogoPage() {
  const products = await getProducts();

  return (
    <div className="p-6 md:p-7">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-lg font-black tracking-wider uppercase text-gray-900"
          style={{ fontFamily: 'var(--font-alexandria)' }}
        >
          Shopify Catalog
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {products.length} product{products.length !== 1 ? 's' : ''} from Shopify
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-16 text-center text-sm text-gray-400">
          No products found. Check Shopify credentials in environment variables.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Product', 'SKU', 'Color', 'Size', 'Price', 'Weight'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.flatMap((product) =>
                  product.variants.map((variant, vi) => {
                    const { color, size } = parseVariant(variant.variante);
                    const colorHex = color ? getColorHex(color) : null;
                    return (
                      <tr
                        key={`${product.id}-${variant.sku}`}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
                      >
                        {/* Product name + image only on first variant row */}
                        <td className="px-5 py-3">
                          {vi === 0 ? (
                            <div className="flex items-center gap-3">
                              {product.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-gray-900 leading-tight max-w-[180px]">
                                {product.title}
                              </span>
                            </div>
                          ) : (
                            <div className="pl-[52px]" />
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">{variant.sku}</td>
                        <td className="px-5 py-3">
                          {color ? (
                            <div className="flex items-center gap-2">
                              {colorHex ? (
                                <span
                                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10"
                                  style={{ backgroundColor: colorHex }}
                                />
                              ) : null}
                              <span className="text-xs text-gray-600">{color}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{size ?? '—'}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(variant.precio)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{variant.peso_kg} kg</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
