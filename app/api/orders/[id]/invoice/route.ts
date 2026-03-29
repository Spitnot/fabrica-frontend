import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

const FROM_NAME        = process.env.PACKLINK_FROM_NAME        ?? 'FIRMA ROLLER';
const FROM_STREET      = process.env.PACKLINK_FROM_STREET      ?? '';
const FROM_CITY        = process.env.PACKLINK_FROM_CITY        ?? '';
const FROM_POSTAL_CODE = process.env.PACKLINK_FROM_POSTAL_CODE ?? '';
const FROM_COUNTRY     = process.env.PACKLINK_FROM_COUNTRY     ?? 'ES';
const FROM_NIF         = 'B12345678'; // Replace with your actual NIF
const SITE_URL         = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, customer:customers(*), order_items(*)')
    .eq('id', id)
    .single();

  if (error || !order) return new NextResponse('Order not found', { status: 404 });

  const inv_cust = order.customer as any;
  const address = inv_cust?.ship_street1
    ? { street: inv_cust.ship_street1, city: inv_cust.ship_city, postal_code: inv_cust.ship_postal_code, country: inv_cust.ship_country }
    : inv_cust?.direccion_envio as any;
  const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const invoiceNumber = `FR-${new Date(order.created_at).getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
  
  const netTotal = order.total_productos;
  const taxRate = 0.21;
  const taxAmount = netTotal * taxRate;
  const grossTotal = netTotal + taxAmount + (order.coste_envio_final || 0);

  const itemRows = (order.order_items ?? []).map((item: any) => `
    <tr>
      <td>${item.nombre_producto}</td>
      <td class="mono">${item.sku}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right">${fmt(item.precio_unitario)}</td>
      <td class="right">${fmt(item.cantidad * item.precio_unitario)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: #fff; padding: 32px 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-logo { height: 36px; width: auto; }
    .brand-sub { font-size: 9px; font-weight: 700; letter-spacing: .22em; color: #D93A35; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .doc-title .ref { font-family: monospace; font-size: 12px; color: #555; margin-top: 4px; }
    .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .address-block h3 { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
    .address-block p { line-height: 1.6; color: #333; }
    .address-block .name { font-weight: 700; font-size: 12px; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 8px 10px; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody td { padding: 8px 10px; vertical-align: top; color: #333; }
    tbody td.mono { font-family: monospace; font-size: 10px; color: #777; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; }
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
    .totals-inner { width: 240px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; color: #555; border-bottom: 1px solid #f0f0f0; }
    .totals-row.grand { border-bottom: none; border-top: 2px solid #111; margin-top: 4px; padding-top: 8px; font-weight: 800; font-size: 13px; color: #111; }
    .totals-row.grand span:last-child { color: #D93A35; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #bbb; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } .no-print { display: none !important; } @page { margin: 1.5cm; size: A4; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;text-align:right">
    <button onclick="window.print()" style="padding:8px 18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <img src="${SITE_URL}/FR_ICON_B.svg" alt="Firma Rollers" class="brand-logo" />
      <div class="brand-sub">B2B</div>
    </div>
    <div class="doc-title">
      <h1>Invoice</h1>
      <div class="ref">${invoiceNumber}</div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">Date: ${date}</div>
    </div>
  </div>
  <div class="addresses">
    <div class="address-block">
      <h3>From</h3>
      <p class="name">${FROM_NAME}</p>
      <p>${FROM_STREET}</p>
      <p>${FROM_POSTAL_CODE} ${FROM_CITY}</p>
      <p>NIF/CIF: ${FROM_NIF}</p>
    </div>
    <div class="address-block">
      <h3>Bill To</h3>
      <p class="name">${order.customer?.company_name ?? '—'}</p>
      <p>${address?.street ?? '—'}</p>
      <p>${address?.postal_code ?? ''} ${address?.city ?? ''}</p>
      <p>${address?.country ?? ''}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Product</th><th>SKU</th><th class="center">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="totals-inner">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(netTotal)}</span></div>
      <div class="totals-row"><span>VAT (21%)</span><span>${fmt(taxAmount)}</span></div>
      ${order.coste_envio_final ? `<div class="totals-row"><span>Shipping</span><span>${fmt(order.coste_envio_final)}</span></div>` : ''}
      <div class="totals-row grand"><span>Total</span><span>${fmt(grossTotal)}</span></div>
    </div>
  </div>
  <div class="footer"><span>Payment due within 30 days</span><span>Generated ${new Date().toLocaleDateString('en-GB')}</span></div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
