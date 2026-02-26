import { NextResponse } from 'next/server';
import { getColorHex, parseVariant } from '@/lib/colors';

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
