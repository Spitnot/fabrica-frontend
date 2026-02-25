import { NextRequest, NextResponse } from 'next/server';

const PACKLINK_API_URL = process.env.PACKLINK_API_URL!;
const PACKLINK_API_KEY = process.env.PACKLINK_API_KEY!;

const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY!;
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE!;

export async function POST(req: NextRequest) {
  const { peso, ancho, alto, largo, destination } = await req.json();

  if (!peso || !ancho || !alto || !largo || !destination) {
    return NextResponse.json({ error: 'Faltan datos para cotizar' }, { status: 400 });
  }

  const params = new URLSearchParams({
    'from[country]':       FROM_COUNTRY,
    'from[zip]':           FROM_POSTAL_CODE,
    'to[country]':         destination.country,
    'to[zip]':             destination.postal_code,
    'packages[0][weight]': String(peso),
    'packages[0][width]':  String(ancho),
    'packages[0][height]': String(alto),
    'packages[0][length]': String(largo),
  });

  console.log('[quotes] URL:', PACKLINK_API_URL);
console.log('[quotes] KEY:', PACKLINK_API_KEY ? 'presente' : 'FALTA');
console.log('[quotes] FROM:', FROM_COUNTRY, FROM_POSTAL_CODE);

  try {
    const res = await fetch(`${PACKLINK_API_URL}/services?${params}`, {
      headers: {
        'Authorization': PACKLINK_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[quotes] Packlink error:', err);
      return NextResponse.json({ error: 'Error al consultar Packlink' }, { status: 502 });
    }

    const services = await res.json();

    // Mapear respuesta de Packlink al formato que usa el frontend
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
