import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

const FROM_NAME        = process.env.PACKLINK_FROM_NAME        ?? 'FIRMA ROLLER';
const FROM_STREET      = process.env.PACKLINK_FROM_STREET      ?? '';
const FROM_CITY        = process.env.PACKLINK_FROM_CITY        ?? '';
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE ?? '';
const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY     ?? 'ES';
const FROM_EMAIL       = process.env.PACKLINK_FROM_EMAIL       ?? '';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, customer:customers(*), order_items(*)')
    .eq('id', id)
    .single();

  if (error || !order) {
    return new NextResponse('Order not found', { status: 404 });
  }

  const address = order.customer?.direccion_envio as any;
  const date = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const itemRows = (order.order_items ?? []).map((item: any) => `
    <tr>
      <td>${item.nombre_producto}</td>
      <td class="mono">${item.sku}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right mono">${item.peso_unitario} kg</td>
      <td class="right">${fmt(item.precio_unitario)}</td>
      <td class="right bold">${fmt(item.cantidad * item.precio_unitario)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Packslip · ${id.slice(0, 8).toUpperCase()}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #111;
      background: #fff;
      padding: 32px 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand svg { height: 28px; width: auto; display: block; }
    .brand-sub { font-size: 9px; font-weight: 700; letter-spacing: .22em; color: #D93A35; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .doc-title .ref { font-family: monospace; font-size: 12px; color: #555; margin-top: 4px; }
    .doc-title .status {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 8px;
      border: 1px solid #D93A35;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .1em;
      color: #D93A35;
      text-transform: uppercase;
    }

    /* ── Addresses ── */
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
    }
    .address-block h3 {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 6px;
    }
    .address-block p { line-height: 1.6; color: #333; }
    .address-block .name { font-weight: 700; font-size: 12px; color: #111; }

    /* ── Meta row ── */
    .meta {
      display: flex;
      gap: 24px;
      background: #f9f9f9;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 10px 16px;
      margin-bottom: 20px;
    }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-item span:first-child { font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #aaa; }
    .meta-item span:last-child  { font-size: 11px; font-weight: 600; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111; color: #fff; }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 8px 10px; vertical-align: top; color: #333; }
    tbody td.mono { font-family: monospace; font-size: 10px; color: #777; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; }
    tbody td.bold { font-weight: 700; color: #111; }

    /* ── Totals ── */
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
    .totals-inner { width: 220px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
      color: #555;
      border-bottom: 1px solid #f0f0f0;
    }
    .totals-row.grand {
      border-bottom: none;
      border-top: 2px solid #111;
      margin-top: 4px;
      padding-top: 8px;
      font-weight: 800;
      font-size: 13px;
      color: #111;
    }
    .totals-row.grand span:last-child { color: #D93A35; }

    /* ── Footer ── */
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      font-size: 9px;
      color: #bbb;
      display: flex;
      justify-content: space-between;
    }

    /* ── Print ── */
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="margin-bottom:20px;text-align:right">
    <button onclick="window.print()"
      style="padding:8px 18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;letter-spacing:.04em">
      Print / Save as PDF
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 133.16 43.48">
          <path fill="#111" d="M94.94,0c-11.92,0-18.81,5.57-22.51,8.57-.52.42-1.08.89-.74,1.28-.62-.37-1.13-.85-1.66-1.28-3.7-3-10.59-8.57-22.51-8.57s-18.82,5.57-22.52,8.56c-.53.44-1.07.9-.81,1.28-.62-.36-1.13-.84-1.67-1.28C18.82,5.57,11.93,0,0,0v33.92c.44.31.83.66,1.24,1,3.7,2.99,10.59,8.56,22.52,8.56s18.82-5.57,22.52-8.56c.54-.44,1.03-.89.78-1.29.62.36,1.12.85,1.66,1.28,3.7,3,10.59,8.57,22.52,8.57s18.82-5.58,22.52-8.57c.55-.44,1.04-.93.73-1.28.62.36,1.12.85,1.65,1.28,3.71,3,10.59,8.57,22.52,8.57V9.55c-.42-.31-.8-.66-1.2-.98-3.71-3-10.59-8.57-22.52-8.57h0Z"/>
          <path fill="#111" d="M129.87,39.05c.33-.3.49-.71.49-1.23s-.16-.9-.49-1.17c-.33-.27-.79-.4-1.4-.4h-1.96v4.51h1.15v-1.26h.85l.67,1.27h1.32l-.98-1.51c.12-.06.25-.11.35-.2h0ZM127.67,37.13h.81c.25,0,.45.06.58.19.13.13.2.31.2.53s-.07.42-.2.55c-.13.13-.33.2-.58.2h-.81v-1.47Z"/>
          <path fill="#111" d="M132.78,36.78c-.25-.58-.59-1.09-1.02-1.53s-.94-.79-1.52-1.04-1.21-.38-1.88-.38-1.31.13-1.89.38c-.58.26-1.09.61-1.52,1.05s-.78.96-1.02,1.55c-.25.59-.37,1.21-.37,1.86s.12,1.27.36,1.85c.24.58.58,1.09,1.01,1.54.43.44.94.79,1.53,1.04.58.25,1.21.38,1.88.38s1.31-.13,1.89-.38c.58-.26,1.09-.6,1.53-1.05.44-.44.78-.96,1.03-1.55.24-.59.37-1.21.37-1.86s-.12-1.28-.37-1.87h-.01ZM131.72,40.06c-.18.44-.44.83-.78,1.17-.34.34-.73.6-1.17.79s-.93.29-1.45.29-.99-.09-1.43-.28-.83-.45-1.16-.79c-.33-.34-.58-.72-.77-1.16s-.27-.91-.27-1.41.09-.97.28-1.42c.18-.44.44-.83.77-1.17.33-.34.71-.6,1.16-.79.44-.19.93-.29,1.45-.29s.99.09,1.43.28.83.45,1.16.79c.33.34.59.72.77,1.16s.28.91.28,1.41-.09.97-.28,1.42h.01Z"/>
        </svg>
      </div>
      <div class="brand-sub">B2B WHOLESALE</div>
    </div>
    <div class="doc-title">
      <h1>Packing Slip</h1>
      <div class="ref">#${id.slice(0, 8).toUpperCase()}</div>
      <div class="status">${STATUS_LABELS[order.status] ?? order.status}</div>
    </div>
  </div>

  <!-- Addresses -->
  <div class="addresses">
    <div class="address-block">
      <h3>From</h3>
      <p class="name">${FROM_NAME}</p>
      <p>${FROM_STREET}</p>
      <p>${FROM_POSTAL_CODE} ${FROM_CITY}</p>
      <p>${FROM_COUNTRY}</p>
      <p>${FROM_EMAIL}</p>
    </div>
    <div class="address-block">
      <h3>Ship To</h3>
      <p class="name">${order.customer?.contacto_nombre ?? '—'}</p>
      <p>${order.customer?.company_name ?? ''}</p>
      <p>${address?.street ?? '—'}</p>
      <p>${address?.postal_code ?? ''} ${address?.city ?? ''}</p>
      <p>${address?.country ?? ''}</p>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta">
    <div class="meta-item">
      <span>Order Date</span>
      <span>${date}</span>
    </div>
    <div class="meta-item">
      <span>Total Weight</span>
      <span>${order.peso_total} kg</span>
    </div>
    ${order.packlink_shipment_id ? `
    <div class="meta-item">
      <span>Shipment Ref</span>
      <span style="font-family:monospace">${order.packlink_shipment_id}</span>
    </div>` : ''}
    ${order.coste_envio_final ? `
    <div class="meta-item">
      <span>Shipping Cost</span>
      <span>${fmt(order.coste_envio_final)}</span>
    </div>` : ''}
  </div>

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>SKU</th>
        <th class="center">Qty</th>
        <th class="right">Weight / unit</th>
        <th class="right">Unit Price</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-inner">
      <div class="totals-row">
        <span>Products subtotal</span>
        <span>${fmt(order.total_productos)}</span>
      </div>
      ${order.coste_envio_estimado ? `
      <div class="totals-row">
        <span>Est. shipping</span>
        <span>${fmt(order.coste_envio_estimado)}</span>
      </div>` : ''}
      ${order.coste_envio_final ? `
      <div class="totals-row">
        <span>Final shipping</span>
        <span>${fmt(order.coste_envio_final)}</span>
      </div>` : ''}
      <div class="totals-row grand">
        <span>Total</span>
        <span>${fmt(order.total_productos)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${FROM_NAME} · ${FROM_EMAIL}</span>
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
