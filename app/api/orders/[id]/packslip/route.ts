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
    .brand { font-size: 22px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .brand-sub { font-size: 9px; font-weight: 700; letter-spacing: .22em; color: #D93A35; margin-top: 2px; }
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
      <div class="brand">${FROM_NAME}</div>
      <div class="brand-sub">B2B</div>
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
