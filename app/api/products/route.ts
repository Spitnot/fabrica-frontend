import { NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_TOKEN  = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

const QUERY = `
  query GetProducts {
    products(first: 250) {
      edges {
        node {
          title
          images(first: 1) {
            edges {
              node {
                url
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

export async function GET() {
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

    if (!res.ok) {
      const err = await res.text();
      console.error('[products] Shopify error:', res.status, err);
      return NextResponse.json({ error: 'Error al consultar Shopify' }, { status: 502 });
    }

    const json = await res.json();

    if (json.errors) {
      console.error('[products] GraphQL errors:', json.errors);
      return NextResponse.json({ error: 'Error GraphQL' }, { status: 502 });
    }

    const products = json.data.products.edges.flatMap(({ node: product }: any) => {
      const imagen: string | undefined = product.images.edges[0]?.node?.url;
      return product.variants.edges
        .filter(({ node: v }: any) => v.sku)
        .map(({ node: variant }: any) => {
          const weightRaw = variant.inventoryItem?.measurement?.weight;
          let peso_kg = weightRaw?.value ?? 0;
          if (weightRaw?.unit === 'GRAMS')   peso_kg = peso_kg / 1000;
          if (weightRaw?.unit === 'POUNDS')  peso_kg = peso_kg * 0.453592;
          if (weightRaw?.unit === 'OUNCES')  peso_kg = peso_kg * 0.0283495;

          return {
            sku:              variant.sku,
            nombre_producto:  product.title,
            variante:         variant.title !== 'Default Title' ? variant.title : undefined,
            precio_mayorista: parseFloat(variant.price),
            peso_kg:          parseFloat(peso_kg.toFixed(3)),
            imagen,
          };
        });
    });

    return NextResponse.json({ data: products });

  } catch (err: any) {
    console.error('[products]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
