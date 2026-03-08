import { NextRequest, NextResponse } from 'next/server';

const PACKLINK_API_URL = process.env.PACKLINK_API_URL!;
const PACKLINK_API_KEY = process.env.PACKLINK_API_KEY!;

const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY!;
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE!;

// Helper to convert "España" -> "ES"
function normalizeCountry(country: string): string {
  if (!country) return '';
  // If already a 2-letter code, return it uppercase
  if (country.length === 2) return country.toUpperCase();

  const map: Record<string, string> = {
    'españa': 'ES', 'spain': 'ES',
    'francia': 'FR', 'france': 'FR',
    'portugal': 'PT',
    'alemania': 'DE', 'germany': 'DE',
    'italia': 'IT', 'italy': 'IT',
    'estados unidos': 'US', 'usa': 'US', 'united states': 'US',
    'méxico': 'MX', 'mexico': 'MX',
  };

  return map[country.toLowerCase()] || country;
}

export async function POST(req: NextRequest) {
  const { peso, ancho, alto, largo, destination } = await req.json();

  console.log('[quotes] Request Data:', { peso, ancho, alto, largo, destination });

  if (!peso || !ancho || !alto || !largo || !destination) {
    return NextResponse.json({ error: 'Missing data for shipping quote' }, { status: 400 });
  }

  if (!destination.country || !destination.postal_code) {
    return NextResponse.json({ error: 'Client has no country or postal code in their shipping address' }, { status: 400 });
  }

  // Normalize the country code
  const countryCode = normalizeCountry(destination.country);
  console.log(`[quotes] Normalizing country: "${destination.country}" -> "${countryCode}"`);

  const params = new URLSearchParams({
    'from[country]':       FROM_COUNTRY,
    'from[zip]':           FROM_POSTAL_CODE,
    'to[country]':         countryCode,
    'to[zip]':             destination.postal_code,
    'packages[0][weight]': String(parseFloat(Number(peso).toFixed(2))),
    'packages[0][width]':  String(Math.round(Number(ancho))),
    'packages[0][height]': String(Math.round(Number(alto))),
    'packages[0][length]': String(Math.round(Number(largo))),
  });

  const fullUrl = `${PACKLINK_API_URL}/services?${params}`;
  console.log('[quotes] Fetching:', fullUrl);

  try {
    const res = await fetch(fullUrl, {
      headers: {
        'Authorization': PACKLINK_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[quotes] Packlink error:', err);
      return NextResponse.json({ error: 'Error querying Packlink' }, { status: 502 });
    }

    const services = await res.json();

    const quotes = services.map((s: any) => ({
      service_id:     s.id,
      carrier:        s.carrier_name,
      service_name:   s.name,
      price:          s.base_price,
      estimated_days: s.transit_hours ? Math.ceil(s.transit_hours / 24) : null,
    }));

    return NextResponse.json({ data: quotes });

  } catch (err: any) {
    console.error('[quotes]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
